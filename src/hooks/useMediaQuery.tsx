import { useState, useEffect } from "react";

/**
 * Custom hook for responsive design that detects if a media query matches
 *
 * @param {string} query - CSS media query string e.g. "(max-width: 768px)"
 * @returns {boolean} - Whether the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  // Initial state based on the current match
  const getMatches = (query: string): boolean => {
    // Check if we're in a browser environment with window.matchMedia
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Update the state initially and whenever the match changes
    const updateMatches = (): void => {
      setMatches(mediaQuery.matches);
    };

    // Initial check
    updateMatches();

    // Add event listener for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateMatches);

      // Clean up
      return () => {
        mediaQuery.removeEventListener("change", updateMatches);
      };
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(updateMatches);

      // Clean up
      return () => {
        mediaQuery.removeListener(updateMatches);
      };
    }
  }, [query]);

  return matches;
};

/**
 * Shorthand hook for mobile devices
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery("(max-width: 640px)");
};

/**
 * Shorthand hook for tablet devices
 */
export const useIsTablet = (): boolean => {
  return useMediaQuery("(min-width: 641px) and (max-width: 1024px)");
};

/**
 * Shorthand hook for desktop devices
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery("(min-width: 1025px)");
};
