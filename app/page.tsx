import { defaultSurvey } from "@/lib/data/defaultSurvey";
import SurveyRunner from "@/components/SurveyRunner";

export default function Page() {
  return <SurveyRunner survey={defaultSurvey} />;
}
