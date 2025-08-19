import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import type { Task } from "../types";
import { fmt } from "../utils/date";

type Props = {
  show: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, "id">) => void;
  start: Date | null;
  end: Date | null;
};

const categories: Task["category"][] = ["To Do", "In Progress", "Review", "Completed"];

export default function TaskModal({ show, onClose, onSave, start, end }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Task["category"]>("To Do");

  useEffect(() => {
    // reset when dialog opens with new range
    if (show) {
      setName("");
      setCategory("To Do");
    }
  }, [show, start, end]);

  const disabled = !start || !end || name.trim() === "";

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Task</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-2 text-muted">
          Range: <strong>{start ? fmt(start) : "?"}</strong> → <strong>{end ? fmt(end) : "?"}</strong>
        </div>
        <Form>
          <Form.Group className="mb-3" controlId="taskName">
            <Form.Label>Name</Form.Label>
            <Form.Control
              placeholder="e.g., Design Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-2" controlId="taskCategory">
            <Form.Label>Category</Form.Label>
            <Form.Select
              value={category}
              onChange={(e) => setCategory(e.target.value as Task["category"])}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={disabled}
          onClick={() => {
            if (!start || !end) return;
            onSave({
              name: name.trim(),
              category,
              start: fmt(start),
              end: fmt(end),
            });
          }}
        >
          Save Task
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
