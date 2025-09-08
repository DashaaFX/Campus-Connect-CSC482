import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: "spring", stiffness: 300, damping: 30 };

export default function Carousel1({
  items = [],
  visibleItems = 5,
  autoplay = true,
  autoplayDelay = 3000,
  pauseOnHover = true,
  loop = true,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const x = useMotionValue(0);
  const containerRef = useRef(null);

  const trackItemOffset = 100 / visibleItems;
  const carouselItems = loop && items.length > 0 ? [...items, ...items.slice(0, visibleItems)] : items;

  // pause on hover
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);
      return () => {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  // autoplay
  useEffect(() => {
    if (autoplay && (!pauseOnHover || !isHovered) && items.length > 0) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= items.length) {
            return loop ? prev + 1 : prev;
          }
          return prev + 1;
        });
      }, autoplayDelay);
      return () => clearInterval(timer);
    }
  }, [autoplay, autoplayDelay, isHovered, loop, items.length, pauseOnHover]);

  const effectiveTransition = isResetting ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationComplete = () => {
    if (loop && currentIndex >= items.length) {
      setIsResetting(true);
      x.set(0);
      setCurrentIndex(0);
      setTimeout(() => setIsResetting(false), 50);
    }
  };

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.min(prev + 1, carouselItems.length - 1));
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -(100 / visibleItems) * (carouselItems.length - visibleItems),
          right: 0,
        },
      };

  return (
    <div ref={containerRef} className="relative w-full px-4 overflow-hidden">
      <motion.div
        className="flex"
        drag="x"
        {...dragProps}
        style={{
          gap: `${GAP}px`,
          x,
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: `-${currentIndex * trackItemOffset}%` }}
        transition={effectiveTransition}
        onAnimationComplete={handleAnimationComplete}
      >
        {carouselItems.map(
          (item, index) =>
            item && (
              <motion.div
                key={index}
                className="flex flex-col overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer shrink-0"
                style={{
                  flex: `0 0 calc(${100 / visibleItems}% - ${GAP}px)`,
                  minHeight: "200px",  
                }}
                onClick={item.onClick}
              >
                {/* Image */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="object-cover w-full h-40 rounded-t-lg"
                />

                {/* Text */}
                <div className="flex flex-col justify-between flex-1 p-3">
                  <h3 className="text-sm font-semibold text-center text-gray-900">{item.title || "No Name"}</h3>
                  <p className="text-xs text-center text-gray-600">{item.description}</p>
                </div>
              </motion.div>

            )
        )}
      </motion.div>

      {/* dots */}
      <div className="flex justify-center mt-4">
        {items.map((_, index) => (
          <motion.div
            key={index}
            className={`h-2.5 w-2.5 rounded-full cursor-pointer mx-1 transition-colors duration-150 ${
              currentIndex % items.length === index ? "bg-purple-600" : "bg-gray-300"
            }`}
            animate={{
              scale: currentIndex % items.length === index ? 1.2 : 1,
            }}
            onClick={() => setCurrentIndex(index)}
            transition={{ duration: 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
