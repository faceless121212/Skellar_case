import { CaptureInput } from "@/components/capture-input";

export default function CapturePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What&apos;s on your mind?
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Dump everything. AI will sort it out.
          </p>
        </div>
        <CaptureInput />
      </div>
    </div>
  );
}
