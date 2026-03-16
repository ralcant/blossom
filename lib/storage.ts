import { Project } from "@/types/project";

const STORAGE_PREFIX = "blossom:";
const CURRENT_PROJECT_KEY = `${STORAGE_PREFIX}currentProject`;
const PROJECTS_LIST_KEY = `${STORAGE_PREFIX}projects`;

export const ProjectStorage = {
  /**
   * Save a project to localStorage
   */
  save(project: Project): void {
    if (typeof window === "undefined") return;

    try {
      // Save project data
      localStorage.setItem(
        `${STORAGE_PREFIX}project:${project.id}`,
        JSON.stringify(project)
      );

      // Update current project
      localStorage.setItem(CURRENT_PROJECT_KEY, project.id);

      // Update projects list
      const projectsList = this.list();
      if (!projectsList.includes(project.id)) {
        projectsList.push(project.id);
        localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));
      }
    } catch (error) {
      console.error("Error saving project to localStorage:", error);
    }
  },

  /**
   * Load a project from localStorage by ID
   */
  load(projectId: string): Project | null {
    if (typeof window === "undefined") return null;

    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}project:${projectId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading project from localStorage:", error);
      return null;
    }
  },

  /**
   * Get the current project
   */
  getCurrentProject(): Project | null {
    if (typeof window === "undefined") return null;

    try {
      const currentId = localStorage.getItem(CURRENT_PROJECT_KEY);
      return currentId ? this.load(currentId) : null;
    } catch (error) {
      console.error("Error getting current project:", error);
      return null;
    }
  },

  /**
   * Get list of all project IDs
   */
  list(): string[] {
    if (typeof window === "undefined") return [];

    try {
      const data = localStorage.getItem(PROJECTS_LIST_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error listing projects:", error);
      return [];
    }
  },

  /**
   * Get all projects with their data
   */
  getAll(): Project[] {
    const projectIds = this.list();
    return projectIds
      .map((id) => this.load(id))
      .filter((project): project is Project => project !== null);
  },

  /**
   * Delete a project
   */
  delete(projectId: string): void {
    if (typeof window === "undefined") return;

    try {
      // Remove project data
      localStorage.removeItem(`${STORAGE_PREFIX}project:${projectId}`);

      // Remove from projects list
      const projectsList = this.list().filter((id) => id !== projectId);
      localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projectsList));

      // Clear current project if it was deleted
      const currentId = localStorage.getItem(CURRENT_PROJECT_KEY);
      if (currentId === projectId) {
        localStorage.removeItem(CURRENT_PROJECT_KEY);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  },

  /**
   * Clear all projects
   */
  clearAll(): void {
    if (typeof window === "undefined") return;

    try {
      const projectsList = this.list();
      projectsList.forEach((id) => {
        localStorage.removeItem(`${STORAGE_PREFIX}project:${id}`);
      });
      localStorage.removeItem(PROJECTS_LIST_KEY);
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    } catch (error) {
      console.error("Error clearing all projects:", error);
    }
  },
};
