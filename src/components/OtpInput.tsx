import React, { useState, useRef, useEffect } from 'react';

const OtpInput = ({ length = 6, value, onChange }) => {
    const [otp, setOtp] = useState(Array(length).fill(''));
    const inputRefs = useRef([]);

    // Initialize refs array
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // Update the component when the value prop changes
    useEffect(() => {
        if (value) {
            const otpArray = value.split('').slice(0, length);
            setOtp([...otpArray, ...Array(length - otpArray.length).fill('')]);
        } else {
            setOtp(Array(length).fill(''));
        }
    }, [value, length]);

    const handleChange = (e, index) => {
        const input = e.target.value;

        // Allow only numbers
        if (/^\d*$/.test(input)) {
            // Take only the last character if multiple are pasted
            const digit = input.slice(-1);

            const newOtp = [...otp];
            newOtp[index] = digit;
            setOtp(newOtp);

            // Emit the concatenated string
            onChange(newOtp.join(''));

            // Move to next input if current one is filled
            if (digit && index < length - 1) {
                inputRefs.current[index + 1].focus();
            }
        }
    };

    const handleKeyDown = (e, index) => {
        // Move to previous input on backspace if current input is empty
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');

        // Check if pasted data contains only numbers
        if (/^\d+$/.test(pastedData)) {
            const digits = pastedData.slice(0, length).split('');

            const newOtp = [...Array(length).fill('')];
            digits.forEach((digit, idx) => {
                if (idx < length) {
                    newOtp[idx] = digit;
                }
            });

            setOtp(newOtp);
            onChange(newOtp.join(''));

            // Focus the next empty input or the last input
            const lastFilledIndex = Math.min(digits.length, length) - 1;
            if (lastFilledIndex < length - 1 && inputRefs.current[lastFilledIndex + 1]) {
                inputRefs.current[lastFilledIndex + 1].focus();
            } else if (inputRefs.current[length - 1]) {
                inputRefs.current[length - 1].focus();
            }
        }
    };

    return (
        <div className="flex justify-center gap-2 w-full my-4">
            {Array(length).fill(0).map((_, index) => (
                <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    ref={el => { inputRefs.current[index] = el }}
                    value={otp[index] || ''}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-16 h-16 text-center text-xl font-medium border rounded-lg  border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none "
                    autoComplete="off"
                />
            ))}
        </div>
    );
};

export default OtpInput;