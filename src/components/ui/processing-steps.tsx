"use client";

import { Message, MessageAvatar } from "./message";
import { cn } from "@/lib/utils";

export type ProcessingStep = "search" | "results" | "generating";

export interface ProcessingStepsProps {
  activeStep?: ProcessingStep;
  documentCount?: number;
  className?: string;
}

export function ProcessingSteps({
  activeStep,
  documentCount = 0,
  className,
}: ProcessingStepsProps) {
  const steps = [
    { id: "search", icon: "🔍", label: "Searching documents..." },
    {
      id: "results",
      icon: "✓",
      label: `Found ${documentCount} document${documentCount !== 1 ? "s" : ""}`,
    },
    { id: "generating", icon: "🧠", label: "Generating response..." },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ["search", "results", "generating"];
    const activeIndex = activeStep ? stepOrder.indexOf(activeStep) : -1;
    const currentIndex = stepOrder.indexOf(stepId);

    if (currentIndex < activeIndex) return "completed";
    if (currentIndex === activeIndex) return "active";
    return "pending";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step) => {
        const status = getStepStatus(step.id);
        const isActive = status === "active";
        const isCompleted = status === "completed";

        return (
          <div key={step.id} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all",
                isActive && "bg-primary text-primary-foreground animate-pulse",
                isCompleted && "bg-green-500 text-white",
                !isActive &&
                  !isCompleted &&
                  "bg-muted text-muted-foreground opacity-50"
              )}
            >
              {isCompleted ? "✓" : step.icon.replace(/[🔍✓🧠]/g, "")}
            </div>
            <div
              className={cn(
                "pt-0.5 text-sm transition-colors",
                isActive && "font-medium text-foreground",
                isCompleted && "text-muted-foreground line-through opacity-70",
                !isActive &&
                  !isCompleted &&
                  "text-muted-foreground opacity-50"
              )}
            >
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
