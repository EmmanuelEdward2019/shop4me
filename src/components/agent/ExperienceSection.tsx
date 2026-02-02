import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ExperienceSectionProps {
  loading: boolean;
  saving: boolean;
  experienceDescription: string;
  onChange: (value: string) => void;
  onSave: () => void;
}

const ExperienceSection = ({
  loading,
  saving,
  experienceDescription,
  onChange,
  onSave,
}: ExperienceSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Shopping Experience
        </CardTitle>
        <CardDescription>
          Describe your shopping experience and expertise to help buyers trust you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="experience">Experience Description</Label>
              <Textarea
                id="experience"
                value={experienceDescription}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Describe your shopping experience... e.g., I have 3 years of experience shopping at Balogun Market. I know the best vendors for quality fabrics at competitive prices. I'm also familiar with electronics at Computer Village..."
                className="min-h-[120px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {experienceDescription.length}/1000 characters
              </p>
            </div>

            <Button onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Experience"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExperienceSection;
