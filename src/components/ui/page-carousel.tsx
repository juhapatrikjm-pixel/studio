"use client"

import {
  motion,
  AnimatePresence,
  PanInfo,
} from "framer-motion"
import { useRouter, usePathname } from "next/navigation"
import { useMemo } from "react"
import { useSidebar } from "./sidebar"

// Represents the props for a menu item, must match layout's menu item structure
type MenuItem = {
  id: string;
  path: string;
}

interface PageCarouselProps {
  children: React.ReactNode;
  menuItems: readonly MenuItem[];
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.98,
  }),
};

// Threshold to trigger navigation
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function PageCarousel({ children, menuItems }: PageCarouselProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openMobile } = useSidebar();

  const { currentIndex } = useMemo(() => {
    const currentIndex = menuItems.findIndex((item) => item.path === pathname);
    return { currentIndex };
  }, [pathname, menuItems]);

  // Using a static direction for simplicity, but could be dynamic
  const direction = 1;

  const paginate = (newDirection: number) => {
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + newDirection;

    // Check bounds
    if (nextIndex >= 0 && nextIndex < menuItems.length) {
      const nextPath = menuItems[nextIndex].path;
      router.push(nextPath);
    }
  };

  const onDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    { offset, velocity }: PanInfo
  ) => {
    // Prevent swipe when mobile sidebar is open
    if (openMobile) return;

    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      paginate(1); // Swipe left to go to the next page
    } else if (swipe > swipeConfidenceThreshold) {
      paginate(-1); // Swipe right to go to the previous page
    }
  };

  return (
    <AnimatePresence initial={false} custom={direction} mode="wait">
      <motion.div
        key={pathname}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 35 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 }
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={onDragEnd}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
