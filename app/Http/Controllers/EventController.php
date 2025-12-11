<?php

// app/Http/Controllers/EventController.php (UPDATED)

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia; // <-- IMPORTANT: Add the Inertia facade
use Carbon\Carbon;

class EventController extends Controller
{
    // --- READ (Index and passing data as props to React) ---
    public function index()
    {
        $events = Auth::user()->events()
            ->get(['id', 'title', 'start', 'end', 'description'])
            ->map(function ($event) {
                // ⭐️ FIX: Explicitly ensure Carbon object is in APP_TIMEZONE
                // before formatting the string without offset.
                $start = $event->start->setTimezone(config('app.timezone'));
                $end = $event->end ? $event->end->setTimezone(config('app.timezone')) : null;
                return [
                    'id' => (string)$event->id,
                    'title' => $event->title,
                    // Format WITHOUT timezone offset so frontend can use Temporal.PlainDateTime.from('YYYY-MM-DDTHH:MM:SS')
                    'start' => $event->start->format('Y-m-d\TH:i:s'),
                    'end' => $event->end ? $event->end->format('Y-m-d\TH:i:s') : null,
                    'description' => $event->description,
                ];
            });

        return Inertia::render('Calendar/Main', [
            'events' => $events,
        ]);
    }

    // Store new event
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'start' => 'required|string', // we will parse with Carbon
            'end' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        // Parse incoming ISO-like string (e.g. "2025-12-10T19:27:00" or "2025-12-10T19:27")
        $start = Carbon::parse($validated['start']);
        $end = isset($validated['end']) ? Carbon::parse($validated['end']) : null;
        $start->setTimezone('UTC');
        if ($end) {
            $end->setTimezone('UTC');
        }

        $event = Auth::user()->events()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start' => $start,
            'end' => $end,
        ]);

        // Return created event payload (so frontend can add it to calendar immediately)
        return redirect()->route('events.index')->with('success', 'Event created.');
    }

    // Update existing event
    public function update(Request $request, Event $event)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'start' => 'required|string',
            'end' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $event->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'start' => Carbon::parse($validated['start']),
            'end' => $validated['end'] ? Carbon::parse($validated['end']) : null,
        ]);

        return redirect()->route('events.index')->with('success', 'Event updated.');
    }

    // Delete event
    public function destroy(Event $event)
    {
        $event->delete();
        return redirect()->route('events.index')->with('success', 'Deleted.');
    }
}
