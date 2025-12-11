// resources/js/Pages/Calendar/Main.jsx
import { useState, useEffect, useMemo } from 'react'
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import {
    createViewDay,
    createViewWeek,
    createViewMonthGrid,
    createViewMonthAgenda,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop"
import { usePage, router } from '@inertiajs/react'
import 'temporal-polyfill/global'
import '@schedule-x/theme-default/dist/index.css'
import styles from '@/css/calendar.module.css'

export default function CalendarApp() {
    const { events } = usePage().props

    const TIMEZONE = "UTC"
    const OFFSET = "+00:00"

    const eventsService = useMemo(() => createEventsServicePlugin(), [])

    const toZoned = (dt) => dt ? `${dt.replace(" ", "T")}${OFFSET}[${TIMEZONE}]` : null

    // Helper function to format Temporal datetime to string for backend
    const formatForBackend = (temporalDateTime) => {
        if (!temporalDateTime) return null
        // Extract just the datetime part without timezone
        const isoString = temporalDateTime.toString()
        // Format: 2025-12-10T19:27:00
        return isoString.slice(0, 19)
    }

    const initialCalendarEvents = useMemo(() => {
        return events.map(e => ({
            id: e.id,
            title: e.title,
            start: Temporal.ZonedDateTime.from(toZoned(e.start)),
            end: e.end ? Temporal.ZonedDateTime.from(toZoned(e.end)) : undefined,
            description: e.description ?? "",
        }))
    }, [events])

    const calendar = useCalendarApp({
        views: [
            createViewDay(),
            createViewWeek(),
            createViewMonthGrid(),
            createViewMonthAgenda()
        ],
        events: initialCalendarEvents,
        plugins: [
            eventsService,
            createDragAndDropPlugin(5), // Add threshold parameter to prevent drag interfering with click
        ],

        callbacks: {
            onEventClick(calendarEvent) {
                console.log('Event clicked - callback triggered!', calendarEvent)
                openModal({
                    id: calendarEvent.id,
                    title: calendarEvent.title,
                    start: calendarEvent.start.toString().slice(0, 16).replace("T", " "),
                    end: calendarEvent.end ? calendarEvent.end.toString().slice(0, 16).replace("T", " ") : "",
                    description: calendarEvent.description || ""
                })
            },

            onEventUpdate(calendarEvent) {
                console.log('Event updated via drag/drop:', calendarEvent)

                const payload = {
                    title: calendarEvent.title,
                    start: calendarEvent.start.toString().slice(0, 19),
                    end: calendarEvent.end ? calendarEvent.end.toString().slice(0, 19) : null,
                    description: calendarEvent.description
                }

                console.log('Sending update payload:', payload)

                router.put(route("events.update", calendarEvent.id), payload, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: (page) => {
                        console.log('Update successful')
                    },
                    onError: (errors) => {
                        console.error('Update failed:', errors)
                        router.reload()
                    }
                })
            },
        },

        onRangeSelection: (range) => {
            openModal({
                id: null,
                title: "",
                start: range.start.toString().slice(0, 16).replace("T", " "),
                end: range.end.toString().slice(0, 16).replace("T", " "),
                description: ""
            })
        },

        onEventUpdate: (ev) => {
            console.log('Event updated via drag/drop:', ev)

            const payload = {
                title: ev.title,
                start: formatForBackend(ev.start),
                end: ev.end ? formatForBackend(ev.end) : null,
                description: ev.description
            }

            console.log('Sending update payload:', payload)

            router.put(route("events.update", ev.id), payload, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: (page) => {
                    console.log('Update successful')
                },
                onError: (errors) => {
                    console.error('Update failed:', errors)
                    // Refresh to restore correct state
                    router.reload()
                }
            })
        }
    })

    useEffect(() => {
        eventsService.set(initialCalendarEvents)
    }, [initialCalendarEvents])

    const [modalOpen, setModalOpen] = useState(false)
    const [modalData, setModalData] = useState(null)

    const openModal = (data) => {
        setModalData(data)
        setModalOpen(true)
    }

    const handleSave = (form) => {
        // Format: "2025-12-10 19:27" -> "2025-12-10T19:27:00"
        const startISO = form.start.replace(" ", "T") + ":00"
        const endISO = form.end ? form.end.replace(" ", "T") + ":00" : null

        const payload = {
            title: form.title,
            description: form.description,
            start: startISO,
            end: endISO
        }

        console.log('Modal save payload:', payload)

        if (form.id) {
            router.put(route("events.update", form.id), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    console.log('Modal update successful')
                    setModalOpen(false)
                },
                onError: (errors) => {
                    console.error('Modal update failed:', errors)
                }
            })
        } else {
            router.post(route("events.store"), payload, {
                preserveScroll: true,
                onSuccess: () => {
                    console.log('Event created successfully')
                    setModalOpen(false)
                },
                onError: (errors) => {
                    console.error('Event creation failed:', errors)
                }
            })
        }
    }

    const handleDelete = (id) => {
        if (!confirm("Delete this event?")) return

        console.log('Deleting event:', id)

        router.delete(route("events.destroy", id), {
            preserveScroll: true,
            onSuccess: () => {
                console.log('Delete successful')
                setModalOpen(false)
            },
            onError: (errors) => {
                console.error('Delete failed:', errors)
            }
        })
    }

    const handleAdd = () => {
        const now = new Date().toISOString().slice(0, 16).replace("T", " ")
        openModal({
            id: null,
            title: "",
            start: now,
            end: now,
            description: ""
        })
    }

    return (
        <div className={styles.container}>
            <div className={styles.head}>
                <h1 className={styles.header}>Calendar</h1>
                <button className={styles.addButton} onClick={handleAdd}>
                    Add Event
                </button>
            </div>

            <div className={styles.calendarWrapper}>
                <ScheduleXCalendar calendarApp={calendar} />
            </div>

            {modalOpen && modalData && (
                <EventModal
                    isOpen={modalOpen}
                    data={modalData}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}
        </div>
    )
}

function EventModal({ isOpen, onClose, data, onSave, onDelete }) {
    const [form, setForm] = useState(data)

    useEffect(() => setForm(data), [data])

    if (!isOpen) return null

    const change = (e) => {
        const { id, value } = e.target
        setForm(prev => ({ ...prev, [id]: value }))
    }

    const submit = (e) => {
        e.preventDefault()
        onSave(form)
    }

    const startValue = form.start?.replace(" ", "T") || ""
    const endValue = form.end?.replace(" ", "T") || ""

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>{form.id ? "Edit Event" : "Add Event"}</h3>

                <form onSubmit={submit}>
                    <label className={styles.modalLabel}>Title</label>
                    <input
                        id="title"
                        value={form.title}
                        onChange={change}
                        className={styles.modalInput}
                        required
                    />

                    <label className={styles.modalLabel}>Start</label>
                    <input
                        id="start"
                        type="datetime-local"
                        value={startValue}
                        onChange={change}
                        className={styles.modalInput}
                        required
                    />

                    <label className={styles.modalLabel}>End</label>
                    <input
                        id="end"
                        type="datetime-local"
                        value={endValue}
                        onChange={change}
                        className={styles.modalInput}
                    />

                    <label className={styles.modalLabel}>Description</label>
                    <textarea
                        id="description"
                        value={form.description}
                        onChange={change}
                        className={styles.modalInput}
                        rows="4"
                    />

                    <div className={styles.modalButtonGroup}>
                        <button
                            type="button"
                            className={`${styles.modalBtn} ${styles.secondaryBtn}`}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        {form.id && (
                            <button
                                type="button"
                                className={`${styles.modalBtn} ${styles.deleteBtn}`}
                                onClick={() => onDelete(form.id)}
                            >
                                Delete
                            </button>
                        )}

                        <button
                            type="submit"
                            className={`${styles.modalBtn} ${styles.primaryBtn}`}
                        >
                            {form.id ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
