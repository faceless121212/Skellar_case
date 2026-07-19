import { CaptureInput } from "@/components/capture-input";

export default function CapturePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Capture</h1>
        <p className="text-muted-foreground mt-1">
          Dump everything on your mind. AI will sort it out.
        </p>
      </div>
      <CaptureInput />
    </div>
  );
}
