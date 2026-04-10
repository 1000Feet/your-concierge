import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Users, Building2, ClipboardList, MessageSquare, BarChart3, Settings, ArrowLeft, Sparkles, Upload, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    icon: LayoutDashboard,
    titleKey: "tutorial.dashboard_title",
    contentKey: "tutorial.dashboard_content",
  },
  {
    icon: Users,
    titleKey: "tutorial.clients_title",
    contentKey: "tutorial.clients_content",
  },
  {
    icon: Building2,
    titleKey: "tutorial.providers_title",
    contentKey: "tutorial.providers_content",
  },
  {
    icon: ClipboardList,
    titleKey: "tutorial.requests_title",
    contentKey: "tutorial.requests_content",
  },
  {
    icon: MessageSquare,
    titleKey: "tutorial.messages_title",
    contentKey: "tutorial.messages_content",
  },
  {
    icon: BarChart3,
    titleKey: "tutorial.analytics_title",
    contentKey: "tutorial.analytics_content",
  },
  {
    icon: Upload,
    titleKey: "tutorial.import_title",
    contentKey: "tutorial.import_content",
  },
  {
    icon: Sparkles,
    titleKey: "tutorial.ai_title",
    contentKey: "tutorial.ai_content",
  },
  {
    icon: Calendar,
    titleKey: "tutorial.availability_title",
    contentKey: "tutorial.availability_content",
  },
  {
    icon: Settings,
    titleKey: "tutorial.settings_title",
    contentKey: "tutorial.settings_content",
  },
];

const Tutorial = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold">{t("tutorial.title")}</h1>
          <p className="text-muted-foreground">{t("tutorial.subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-foreground leading-relaxed">{t("tutorial.intro")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <section.icon className="h-5 w-5 text-primary" />
                {t(section.titleKey)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                {t(section.contentKey)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("tutorial.tips_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t("tutorial.tip_1")}</li>
            <li>{t("tutorial.tip_2")}</li>
            <li>{t("tutorial.tip_3")}</li>
            <li>{t("tutorial.tip_4")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tutorial;
