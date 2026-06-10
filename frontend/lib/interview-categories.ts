import {
  BotIcon,
  FlaskConicalIcon,
  GraduationCapIcon,
  UsersIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

export type InterviewCategory = {
  label: string;
  slug: string;
  description: string;
  icon: LucideIcon;
};

export const INTERVIEW_CATEGORIES: InterviewCategory[] = [
  {
    label: "AI in the Workplace",
    slug: "ai-in-the-workplace",
    description: "How professionals integrate AI into daily work",
    icon: BotIcon,
  },
  {
    label: "Productivity Tools",
    slug: "productivity-tools",
    description: "Tools, workflows, and efficiency at work",
    icon: ZapIcon,
  },
  {
    label: "Scientific Research",
    slug: "scientific-research",
    description: "AI in research workflows, trust, and discovery",
    icon: FlaskConicalIcon,
  },
  {
    label: "Education & Learning",
    slug: "education-learning",
    description: "Teaching, learning, and AI in the classroom",
    icon: GraduationCapIcon,
  },
  {
    label: "Leadership & Management",
    slug: "leadership-management",
    description: "Leading teams and decisions in an AI-enabled workplace",
    icon: UsersIcon,
  },
];
