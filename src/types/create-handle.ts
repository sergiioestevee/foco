/** Lets the Tareas tab's + button open the create form of the segment that is showing. */
export type CreateHandle<Kind extends string = never> = {
  create: (kind?: Kind) => void;
};
