import { useMemo, useRef, useState } from "react";
import {
  addDays,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { Button, Container, Row, Col, Badge } from "react-bootstrap";
import type{ Task } from "../types";
import TaskModal from "./TaskModal";
import {
  clampRange,
  dateInRange,
  durationDays,
  fmt,
  includesCaseInsensitive,
  monthGridDays,
  moveRangeKeepingLength,
  setStartOrEndToISO,
} from "../utils/date";

type DragMeta =
  | { kind: "select"; start: Date; end: Date }
  | { kind: "move"; taskId: string }
  | { kind: "resize"; taskId: string; side: "left" | "right" }
  | null;

const categoryColors: Record<Task["category"], string> = {
  "To Do": "#6c757d",
  "In Progress": "#0d6efd",
  "Review": "#fd7e14",
  "Completed": "#198754",
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);

  // filters
  const [query, setQuery] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<Set<Task["category"]>>(
    new Set()
  );
  const [durationFilter, setDurationFilter] = useState<0 | 7 | 14 | 21>(0);

  // drag / selection state
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);
  const dragRef = useRef<DragMeta>(null);

  const gridDays = useMemo(() => monthGridDays(currentMonth), [currentMonth]);
  const monthStart = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    [currentMonth]
  );

  // ----- Filtering -----
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (query && !includesCaseInsensitive(t.name, query)) return false;
      if (categoryFilters.size && !categoryFilters.has(t.category)) return false;
      if (durationFilter) {
        const len = durationDays(t.start, t.end);
        if (len > durationFilter) return false;
      }
      return true;
    });
  }, [tasks, query, categoryFilters, durationFilter]);

  // ----- Helpers -----
  const tasksOnDay = (dayISO: string) =>
    filteredTasks.filter((t) => dateInRange(dayISO, t.start, t.end));

  // ----- Mouse selection for creating tasks -----
  const handleMouseDownDay = (day: Date) => {
    setPendingStart(day);
    setPendingEnd(day);
    dragRef.current = { kind: "select", start: day, end: day };
  };

  const handleMouseEnterDay = (day: Date) => {
    const meta = dragRef.current;
    if (meta?.kind === "select") {
      setPendingEnd(day);
      dragRef.current = { kind: "select", start: meta.start, end: day };
    }
  };

  const [modalOpen, setModalOpen] = useState(false);

  const handleMouseUpDay = () => {
    const meta = dragRef.current;
    if (meta?.kind === "select") {
      setModalOpen(true);
    }
    dragRef.current = null;
  };

  // ----- Create task from modal -----
  const handleSaveTask = (payload: Omit<Task, "id">) => {
    const newTask: Task = { id: crypto.randomUUID(), ...payload };
    setTasks((prev) => [...prev, newTask]);
    // clear selection
    setPendingStart(null);
    setPendingEnd(null);
    setModalOpen(false);
  };

  // ----- Drag to move task -----
  const onTaskDragStart = (taskId: string, e: React.DragEvent) => {
    dragRef.current = { kind: "move", taskId };
    // set drag preview to transparent pixel so cursor stays clean
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAAAAACw="; // 1x1 transparent gif
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onTaskResizeDragStart = (
    taskId: string,
    side: "left" | "right",
    e: React.DragEvent
  ) => {
    dragRef.current = { kind: "resize", taskId, side };
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDayDrop = (dropDay: Date) => {
    const meta = dragRef.current;
    if (!meta) return;

    if (meta.kind === "move") {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === meta.taskId
            ? {
                ...t,
                ...moveRangeKeepingLength(fmt(dropDay), t.start, t.end),
              }
            : t
        )
      );
    }

    if (meta.kind === "resize") {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === meta.taskId
            ? {
                ...t,
                ...setStartOrEndToISO(meta.side, fmt(dropDay), t.start, t.end),
              }
            : t
        )
      );
    }

    dragRef.current = null;
  };

  // UI helpers
  const isInPendingRange = (d: Date) => {
    if (!pendingStart || !pendingEnd) return false;
    const [s, e] = clampRange(pendingStart, pendingEnd);
    return d >= s && d <= e;
  };

  const toggleCategory = (c: Task["category"]) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <Container className="py-3">
      {/* Controls */}
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
            )
          }
        >
          ← Prev
        </Button>
        <h4 className="m-0">{format(currentMonth, "MMMM yyyy")}</h4>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            )
          }
        >
          Next →
        </Button>

        <div className="vr mx-2" />

        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 260 }}
          placeholder="Search by task name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="vr mx-2" />

        {/* Category filters */}
        <div className="d-flex gap-2 flex-wrap">
          {(["To Do", "In Progress", "Review", "Completed"] as Task["category"][]).map(
            (c) => (
              <label key={c} className="d-flex align-items-center gap-1">
                <input
                  type="checkbox"
                  checked={categoryFilters.has(c)}
                  onChange={() => toggleCategory(c)}
                />
                <span>{c}</span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: categoryColors[c],
                    display: "inline-block",
                    marginLeft: 4,
                  }}
                />
              </label>
            )
          )}
        </div>

        <div className="vr mx-2" />

        {/* Duration filters */}
        <div className="d-flex gap-2">
          {[
            { v: 0 as const, label: "All" },
            { v: 7 as const, label: "≤ 1 week" },
            { v: 14 as const, label: "≤ 2 weeks" },
            { v: 21 as const, label: "≤ 3 weeks" },
          ].map((opt) => (
            <label key={opt.v} className="d-flex align-items-center gap-1">
              <input
                type="radio"
                name="dur"
                checked={durationFilter === opt.v}
                onChange={() => setDurationFilter(opt.v)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Weekday header */}
      <Row className="text-center fw-semibold border bg-light">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Col key={d} className="p-2">
            {d}
          </Col>
        ))}
      </Row>

      {/* Calendar grid */}
      <div
        onMouseLeave={() => {
          // cancel selection if mouse leaves calendar
          if (dragRef.current?.kind === "select") {
            dragRef.current = null;
            setPendingStart(null);
            setPendingEnd(null);
          }
        }}
      >
        {Array.from({ length: gridDays.length / 7 }).map((_, rowIdx) => {
          const slice = gridDays.slice(rowIdx * 7, rowIdx * 7 + 7);
          return (
            <Row key={rowIdx} className="g-0">
              {slice.map((day) => {
                const dayISO = fmt(day);
                const isOtherMonth = !isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                const inPending = isInPendingRange(day);

                return (
                  <Col
                    key={day.toISOString()}
                    className={`border p-2 position-relative`}
                    style={{
                      minHeight: 120,
                      backgroundColor: inPending
                        ? "rgba(13,110,253,0.15)"
                        : isOtherMonth
                        ? "#f8f9fa"
                        : "white",
                      cursor: "default",
                    }}
                    // selection
                    onMouseDown={() => handleMouseDownDay(day)}
                    onMouseEnter={() => handleMouseEnterDay(day)}
                    onMouseUp={handleMouseUpDay}
                    // drop targets
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDayDrop(day)}
                  >
                    {/* date label */}
                    <div
                      className="d-flex justify-content-between align-items-start"
                      style={{ pointerEvents: "none" }}
                    >
                      <span
                        className="fw-semibold"
                        style={{
                          opacity: isOtherMonth ? 0.5 : 1,
                        }}
                      >
                        {format(day, "d")}
                      </span>
                      {isToday && (
                        <Badge bg="primary" pill>
                          Today
                        </Badge>
                      )}
                    </div>

                    {/* tasks */}
                    <div className="mt-1 d-flex flex-column gap-1">
                      {tasksOnDay(dayISO).map((t) => {
                        const total = durationDays(t.start, t.end);
                        const color = categoryColors[t.category];

                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) => onTaskDragStart(t.id, e)}
                            className="rounded px-2 py-1 text-white"
                            style={{
                              background: color,
                              fontSize: 12,
                              userSelect: "none",
                            }}
                            title={`${t.name} • ${t.category} • ${t.start} → ${t.end} (${total}d)`}
                          >
                            <div className="d-flex align-items-center">
                              {/* left resize handle */}
                              <span
                                draggable
                                onDragStart={(e) =>
                                  onTaskResizeDragStart(t.id, "left", e)
                                }
                                style={{
                                  width: 8,
                                  height: 16,
                                  marginRight: 6,
                                  background: "rgba(255,255,255,0.7)",
                                  cursor: "ew-resize",
                                  borderRadius: 2,
                                }}
                              />
                              <span className="text-truncate">{t.name}</span>
                              {/* right resize handle */}
                              <span
                                draggable
                                onDragStart={(e) =>
                                  onTaskResizeDragStart(t.id, "right", e)
                                }
                                style={{
                                  width: 8,
                                  height: 16,
                                  marginLeft: 6,
                                  background: "rgba(255,255,255,0.7)",
                                  cursor: "ew-resize",
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Col>
                );
              })}
            </Row>
          );
        })}
      </div>

      {/* Create Task Modal (opens after drag-select) */}
      <TaskModal
        show={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPendingStart(null);
          setPendingEnd(null);
        }}
        onSave={(payload) => handleSaveTask(payload)}
        start={pendingStart && pendingEnd ? clampRange(pendingStart, pendingEnd)[0] : null}
        end={pendingStart && pendingEnd ? clampRange(pendingStart, pendingEnd)[1] : null}
      />
    </Container>
  );
}
