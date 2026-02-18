'use client';

import type { DisputeTimeline as DisputeTimelineType } from '@korrectng/shared';

interface DisputeTimelineProps {
  timeline: DisputeTimelineType[];
}

export default function DisputeTimeline({ timeline }: DisputeTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Timeline</h3>

      <div className="space-y-4">
        {timeline.slice().reverse().map((event, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-brand-green rounded-full" />
              {index < timeline.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex justify-between items-start">
                <span className="font-medium">{event.action}</span>
                <span className="text-sm text-brand-gray">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
              {event.details && (
                <p className="text-sm text-brand-gray mt-1">{event.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
