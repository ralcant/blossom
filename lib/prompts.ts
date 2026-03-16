import { Project, LyricPhrase, STYLE_TEMPLATES } from "@/types/project";

/**
 * Get the default prompt template for a project's style
 */
export function getDefaultPromptTemplate(project: Project): string {
  const styleTemplate = STYLE_TEMPLATES.find((t) => t.id === project.styleTemplate);
  return styleTemplate?.promptTemplate || STYLE_TEMPLATES[0].promptTemplate;
}

/**
 * Get the prompt template for a cover image (uses {{title}} instead of {{lyric}})
 */
export function getCoverPromptTemplate(project: Project): string {
  const baseTemplate = project.coverPrompt || getDefaultPromptTemplate(project);
  // Replace {{lyric}} with {{title}} for cover images
  return baseTemplate.replace(/\{\{lyric\}\}/g, "{{title}}");
}

/**
 * Get the prompt template for a lyric phrase
 */
export function getLyricPromptTemplate(phrase: LyricPhrase, project: Project): string {
  return phrase.customPrompt || getDefaultPromptTemplate(project);
}

/**
 * Replace variables in a prompt template with actual values
 */
export function fillPromptVariables(
  template: string,
  variables: {
    lyric?: string;
    title?: string;
    font?: string;
    color?: string;
  }
): string {
  let prompt = template;

  if (variables.lyric !== undefined) {
    prompt = prompt.replace(/\{\{lyric\}\}/g, variables.lyric);
  }

  if (variables.title !== undefined) {
    prompt = prompt.replace(/\{\{title\}\}/g, variables.title);
  }

  if (variables.font !== undefined) {
    prompt = prompt.replace(/\{\{font\}\}/g, variables.font);
  }

  if (variables.color !== undefined) {
    prompt = prompt.replace(/\{\{color\}\}/g, variables.color);
  }

  return prompt;
}
