import { notFound } from "next/navigation";
import ThemeLearning from "../ThemeLearning";
import { THEMES, getThemeById } from "../themes";

export function generateStaticParams() {
  return THEMES.map((t) => ({ themeId: t.id }));
}

export default async function ThemeLearningPage({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = await params;
  if (!getThemeById(themeId)) notFound();
  return <ThemeLearning themeId={themeId} />;
}
