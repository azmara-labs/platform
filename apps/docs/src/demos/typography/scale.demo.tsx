import { Typography } from "@azmr/ui/typography";

export default function TypographyScale() {
  return (
    <div className="flex flex-col gap-2">
      <Typography variant="overline">Overline</Typography>
      <Typography variant="h1">Heading 1</Typography>
      <Typography variant="h2">Heading 2</Typography>
      <Typography variant="h3">Heading 3</Typography>
      <Typography variant="h4">Heading 4</Typography>
      <Typography variant="h5">Heading 5</Typography>
      <Typography variant="h6">Heading 6</Typography>
      <Typography variant="lead">A lead paragraph introduces the page.</Typography>
      <Typography>Body text is the default variant and renders a paragraph.</Typography>
      <Typography variant="small">Small text for secondary detail.</Typography>
      <Typography variant="caption">Caption text</Typography>
    </div>
  );
}
