export type Task = {
  id: string;
  name: string;
  start: string; // yyyy-mm-dd
  end: string;   // yyyy-mm-dd
  category: "To Do" | "In Progress" | "Review" | "Completed";
};
