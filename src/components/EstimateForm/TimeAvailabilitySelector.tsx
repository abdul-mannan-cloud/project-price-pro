import { useState } from "react";
import { LucideCircleArrowDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface TimeAvailabilityProps {
    onChange: (timePreference: {
        flexibility: "on_date" | "before_date" | "flexible";
        date?: string;
        timeOfDay?: "morning" | "midday" | "afternoon" | "evening";
        needSpecificTime: boolean;
    }) => void;
}

export const TimeAvailabilitySelector = ({ onChange }: TimeAvailabilityProps) => {
    const [flexibility, setFlexibility] = useState<"on_date" | "before_date" | "flexible">("flexible");
    const [date, setDate] = useState<string>("");
    const [needSpecificTime, setNeedSpecificTime] = useState(false);
    const [timeOfDay, setTimeOfDay] = useState<"morning" | "midday" | "afternoon" | "evening" | null>(null);

    const handleFlexibilityChange = (value: "on_date" | "before_date" | "flexible") => {
        setFlexibility(value);
        onChange({
            flexibility: value,
            date: value !== "flexible" ? date : undefined,
            timeOfDay: needSpecificTime ? timeOfDay || undefined : undefined,
            needSpecificTime
        });
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value);
        onChange({
            flexibility,
            date: e.target.value,
            timeOfDay: needSpecificTime ? timeOfDay || undefined : undefined,
            needSpecificTime
        });
    };

    const handleTimeOfDayChange = (value: "morning" | "midday" | "afternoon" | "evening") => {
        setTimeOfDay(value);
        onChange({
            flexibility,
            date: flexibility !== "flexible" ? date : undefined,
            timeOfDay: value,
            needSpecificTime
        });
    };

    const handleNeedSpecificTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNeedSpecificTime(e.target.checked);
        onChange({
            flexibility,
            date: flexibility !== "flexible" ? date : undefined,
            timeOfDay: e.target.checked ? timeOfDay || undefined : undefined,
            needSpecificTime: e.target.checked
        });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-lg font-semibold mb-3 text-navy-700">
                    When do you need this done?
                </label>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={`px-4 flex gap-1 py-2 rounded-full border ${
                            flexibility === "on_date"
                                ? "bg-primary text-secondary border-primary"
                                : "bg-white text-navy-800 border-navy-800"
                        }`}
                        onClick={() => handleFlexibilityChange("on_date")}
                    >
                        On date
                        <LucideCircleArrowDown className='pt-1' size={20}/>
                    </button>
                    <button
                        type="button"
                        className={`px-4 flex py-2 rounded-full border ${
                            flexibility === "before_date"
                                ? "bg-primary text-secondary border-primary"
                                : "bg-white text-secondary-foreground border-navy-800"
                        }`}
                        onClick={() => handleFlexibilityChange("before_date")}
                    >
                        Before date <span className="ml-1">
                            <LucideCircleArrowDown className='pt-1' size={20}/>
                    </span>
                    </button>
                    <button
                        type="button"
                        className={`px-4 py-2 rounded-full border ${
                            flexibility === "flexible"
                                ? "bg-primary text-secondary border-primary"
                                : "bg-white text-navy-800 border-navy-800"
                        }`}
                        onClick={() => handleFlexibilityChange("flexible")}
                    >
                        I'm flexible
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {flexibility !== "flexible" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <label className="block text-sm font-medium mb-1" htmlFor="date">
                            {flexibility === "on_date" ? "Select date:" : "Select before date:"}
                        </label>
                        <input
                            type="date"
                            id="date"
                            value={date}
                            onChange={handleDateChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="specificTime"
                    checked={needSpecificTime}
                    onChange={handleNeedSpecificTimeChange}
                    className="h-4 w-4 text-navy-800 border-gray-300 rounded"
                />
                <label htmlFor="specificTime" className="ml-2 text-sm text-gray-700">
                    I need a certain time of day
                </label>
            </div>

            <AnimatePresence>
            {needSpecificTime && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            type="button"
                            onClick={() => handleTimeOfDayChange("morning")}
                            className={`p-4 rounded-md ${
                                timeOfDay === "morning" ? "bg-primary-100 border-primary border-2" : "bg-gray-100"
                            }`}
                        >
                            <div className="flex flex-col items-center">
                                <svg className="w-6 h-6 text-navy-800 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                </svg>
                                <span className="font-medium text-navy-800">Morning</span>
                                <span className="text-xs text-gray-500">Before 10am</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTimeOfDayChange("midday")}
                            className={`p-4 rounded-md ${
                                timeOfDay === "midday" ? "bg-primary-100 border-primary border-2" : "bg-gray-100"
                            }`}
                        >
                            <div className="flex flex-col items-center">
                                <svg className="w-6 h-6 text-navy-800 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <circle cx="12" cy="12" r="5" strokeWidth="2" />
                                    <path strokeLinecap="round" strokeWidth="2" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                                <span className="font-medium text-navy-800">Midday</span>
                                <span className="text-xs text-gray-500">10am - 2pm</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTimeOfDayChange("afternoon")}
                            className={`p-4 rounded-md ${
                                timeOfDay === "afternoon" ? "bg-primary-100 border-primary border-2" : "bg-gray-100"
                            }`}
                        >
                            <div className="flex flex-col items-center">
                                <svg className="w-6 h-6 text-navy-800 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                </svg>
                                <span className="font-medium text-navy-800">Afternoon</span>
                                <span className="text-xs text-gray-500">2pm - 6pm</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTimeOfDayChange("evening")}
                            className={`p-4 rounded-md ${
                                timeOfDay === "evening" ? "bg-primary-100 border-primary border-2" : "bg-gray-100"
                            }`}
                        >
                            <div className="flex flex-col items-center">
                                <svg className="w-6 h-6 text-navy-800 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                <span className="font-medium text-navy-800">Evening</span>
                                <span className="text-xs text-gray-500">After 6pm</span>
                            </div>
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};