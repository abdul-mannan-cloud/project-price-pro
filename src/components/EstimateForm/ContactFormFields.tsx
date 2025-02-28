import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ContactFormFieldsProps {
    formData: {
        fullName: string;
        email: string;
        phone: string;
        address: string;
    };
    onChange: (field: string, value: string) => void;
}

// Google Maps API key (Note: You should secure this in production)
const GOOGLE_API_KEY = "AIzaSyBuZj-RWOoAc24CaC2h4SY9LvD-WzQPtJs";

export const ContactFormFields = ({ formData, onChange }: ContactFormFieldsProps) => {
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle clicks outside the suggestions dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetch address suggestions when user types in address field
    const getAddressSuggestions = async (input: string) => {
        if (!input || input.length < 3) {
            setAddressSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${GOOGLE_API_KEY}`
            );
            const data = await response.json();

            if (data.status === "OK" && data.results) {
                const suggestions = data.results.map((result: any) => result.formatted_address);
                setAddressSuggestions(suggestions);
                setShowSuggestions(true);
            } else {
                setAddressSuggestions([]);
            }
        } catch (error) {
            console.error("Error fetching address suggestions:", error);
            setAddressSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce function to prevent too many API calls
    const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return function(...args: any[]) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // Debounced version of getAddressSuggestions
    const debouncedGetSuggestions = useRef(
        debounce(getAddressSuggestions, 500)
    ).current;

    // Handle address input change
    const handleAddressChange = (value: string) => {
        onChange('address', value);
        debouncedGetSuggestions(value);
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (suggestion: string) => {
        onChange('address', suggestion);
        setShowSuggestions(false);
    };

    return (
        <div className="space-y-5">
            <div className="form-group relative">
                <Input
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={(e) => onChange('fullName', e.target.value)}
                    required
                    className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                    Full Name
                </label>
            </div>

            <div className="form-group relative">
                <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    required
                    className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                    Email
                </label>
            </div>

            <div className="form-group relative">
                <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => onChange('phone', e.target.value)}
                    required
                    className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                    Phone Number
                </label>
            </div>

            <div className="form-group relative">
                <Input
                    ref={inputRef}
                    placeholder="Project Address"
                    value={formData.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => formData.address && setShowSuggestions(true)}
                    required
                    className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                    Project Address
                </label>

                {isLoading && (
                    <div className="absolute right-3 top-3">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {showSuggestions && addressSuggestions.length > 0 && (
                    <div
                        ref={suggestionRef}
                        className="absolute z-10 -mt-5 w-full bg-background border border-input rounded-md shadow-lg"
                    >
                        <ul className="py-1 max-h-60 overflow-auto">
                            {addressSuggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    className="px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                    onClick={() => handleSelectSuggestion(suggestion)}
                                >
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactFormFields;