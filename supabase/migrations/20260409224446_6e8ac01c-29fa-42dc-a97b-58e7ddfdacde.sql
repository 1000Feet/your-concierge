
-- 1. provider_availability
CREATE TABLE public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time,
  end_time time,
  max_capacity integer NOT NULL DEFAULT 1,
  current_bookings integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, date)
);

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own provider availability"
ON public.provider_availability FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_availability.provider_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_availability.provider_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_provider_availability_updated_at
BEFORE UPDATE ON public.provider_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. conversations
CREATE TYPE public.conversation_channel AS ENUM ('in_app', 'whatsapp', 'email');

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  channel public.conversation_channel NOT NULL DEFAULT 'in_app',
  subject text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations"
ON public.conversations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. messages
CREATE TYPE public.message_sender_type AS ENUM ('concierge', 'client', 'provider', 'system');

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type public.message_sender_type NOT NULL DEFAULT 'concierge',
  content text NOT NULL,
  is_ai_generated boolean NOT NULL DEFAULT false,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages"
ON public.messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. message_templates
CREATE TYPE public.template_category AS ENUM ('client_proposal', 'provider_inquiry', 'follow_up', 'confirmation', 'cancellation', 'welcome', 'other');

CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category public.template_category NOT NULL DEFAULT 'other',
  name text NOT NULL,
  subject text,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all templates"
ON public.message_templates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users manage own templates"
ON public.message_templates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own templates"
ON public.message_templates FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own templates"
ON public.message_templates FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. request_status_history
CREATE TABLE public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own request history"
ON public.request_status_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_status_history.request_id AND r.user_id = auth.uid()));

CREATE POLICY "Users insert own request history"
ON public.request_status_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_status_history.request_id AND r.user_id = auth.uid()));

-- 6. Trigger: validate request status transitions
CREATE OR REPLACE FUNCTION public.validate_request_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  
  IF (OLD.status = 'draft' AND NEW.status IN ('sent')) OR
     (OLD.status = 'sent' AND NEW.status IN ('waiting')) OR
     (OLD.status = 'waiting' AND NEW.status IN ('confirmed')) OR
     (OLD.status = 'confirmed' AND NEW.status IN ('completed'))
  THEN RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER validate_request_status
BEFORE UPDATE OF status ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.validate_request_status_transition();

-- 7. Trigger: notify on request status change
CREATE OR REPLACE FUNCTION public.on_request_status_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (NEW.user_id, 'status_change',
      'Stato richiesta aggiornato',
      format('La richiesta "%s" è passata da %s a %s', LEFT(NEW.description, 50), OLD.status, NEW.status),
      NEW.id, 'request');
  END IF;
  
  INSERT INTO public.request_status_history (request_id, old_status, new_status, changed_by)
  VALUES (NEW.id, OLD.status::text, NEW.status::text, auth.uid());
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_request_status_change
AFTER UPDATE OF status ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.on_request_status_notification();

-- 8. Trigger: notify on provider response
CREATE OR REPLACE FUNCTION public.on_provider_response_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_provider_name text;
  v_description text;
BEGIN
  IF NEW.status IN ('accepted', 'declined') AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT r.user_id, r.description INTO v_user_id, v_description
    FROM public.requests r WHERE r.id = NEW.request_id;
    
    SELECT p.name INTO v_provider_name FROM public.providers p WHERE p.id = NEW.provider_id;
    
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (v_user_id,
      CASE WHEN NEW.status = 'accepted' THEN 'provider_accepted' ELSE 'provider_declined' END,
      CASE WHEN NEW.status = 'accepted' THEN 'Fornitore ha accettato' ELSE 'Fornitore ha rifiutato' END,
      format('%s ha %s la richiesta "%s"', v_provider_name, 
        CASE WHEN NEW.status = 'accepted' THEN 'accettato' ELSE 'rifiutato' END,
        LEFT(v_description, 50)),
      NEW.request_id, 'request');
    
    IF NEW.status = 'accepted' AND NEW.quoted_price IS NOT NULL THEN
      UPDATE public.requests SET margin = final_price - NEW.quoted_price
      WHERE id = NEW.request_id AND final_price IS NOT NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_provider_response
AFTER UPDATE OF status ON public.request_providers
FOR EACH ROW EXECUTE FUNCTION public.on_provider_response_notification();

-- 9. Trigger: notify on new message
CREATE OR REPLACE FUNCTION public.on_new_message_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_subject text;
BEGIN
  SELECT c.user_id, c.subject INTO v_user_id, v_subject
  FROM public.conversations c WHERE c.id = NEW.conversation_id;
  
  IF NEW.sender_type != 'concierge' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (v_user_id, 'new_message', 'Nuovo messaggio',
      format('Nuovo messaggio in "%s": %s', COALESCE(v_subject, 'Conversazione'), LEFT(NEW.content, 80)),
      NEW.conversation_id, 'conversation');
  END IF;
  
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_message_notification();

-- 10. Default message templates
INSERT INTO public.message_templates (user_id, category, name, subject, body, variables, is_default) VALUES
('00000000-0000-0000-0000-000000000000', 'client_proposal', 'Proposta Servizio', 'Proposta per {service_type}',
 'Gentile {client_name},\n\nle proponiamo il seguente servizio di {service_type} per il {service_date}:\n\n{description}\n\nPrezzo: €{price}\n\nResta a disposizione per qualsiasi domanda.\n\nCordiali saluti,\nIl team Concierge',
 ARRAY['client_name','service_type','service_date','description','price'], true),
('00000000-0000-0000-0000-000000000000', 'provider_inquiry', 'Richiesta Disponibilità', 'Richiesta disponibilità {service_date}',
 'Buongiorno {provider_name},\n\nvorremmo verificare la disponibilità per il seguente servizio:\n\nData: {service_date}\nTipo: {service_type}\nGruppo: {group_size} persone\n\n{description}\n\nPuò confermare disponibilità e prezzo?\n\nGrazie,\nConcierge Desk',
 ARRAY['provider_name','service_date','service_type','group_size','description'], true),
('00000000-0000-0000-0000-000000000000', 'follow_up', 'Follow-up', 'Follow-up richiesta',
 'Buongiorno {name},\n\nle scrivo per un aggiornamento riguardo alla richiesta di {service_type} del {service_date}.\n\nAttendo un gentile riscontro.\n\nCordiali saluti,\nConcierge Desk',
 ARRAY['name','service_type','service_date'], true),
('00000000-0000-0000-0000-000000000000', 'confirmation', 'Conferma Prenotazione', 'Conferma prenotazione {service_type}',
 'Gentile {client_name},\n\nle confermiamo la prenotazione per:\n\nServizio: {service_type}\nData: {service_date}\nOrario: {service_time}\nFornitore: {provider_name}\nPrezzo: €{price}\n\nLa aspettiamo!\n\nCordiali saluti,\nConcierge Desk',
 ARRAY['client_name','service_type','service_date','service_time','provider_name','price'], true),
('00000000-0000-0000-0000-000000000000', 'cancellation', 'Cancellazione', 'Cancellazione servizio',
 'Gentile {name},\n\nla informiamo che il servizio di {service_type} previsto per il {service_date} è stato cancellato.\n\nMotivo: {reason}\n\nCi scusiamo per il disagio.\n\nCordiali saluti,\nConcierge Desk',
 ARRAY['name','service_type','service_date','reason'], true),
('00000000-0000-0000-0000-000000000000', 'welcome', 'Benvenuto', 'Benvenuto {client_name}',
 'Gentile {client_name},\n\nbenvenuto/a presso {hotel}!\n\nSiamo lieti di averla come ospite. Il nostro servizio concierge è a sua completa disposizione per rendere il suo soggiorno indimenticabile.\n\nNon esiti a contattarci per qualsiasi esigenza.\n\nCordiali saluti,\nConcierge Desk',
 ARRAY['client_name','hotel'], true);
