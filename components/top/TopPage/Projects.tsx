import React, { forwardRef, useRef, useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';
import { Project } from '@/lib/project';
import { useTranslation } from '@/i18n/client';

interface ProjectsProps {
  projects: Project[]
  onProjectClick: (project: Project) => void;
  lng: string;
}

const Projects = forwardRef<HTMLDivElement, ProjectsProps>((props, ref) => {
  const { projects, onProjectClick, lng } = props;
  const { t } = useTranslation(lng);

  // Ref for the scrollable container
  const scrollRef = useRef<HTMLDivElement>(null);
  // State for mouse drag scroll
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  // State for touch drag scroll
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchScrollLeft, setTouchScrollLeft] = useState(0);
  // State for drag distance and drag flag
  const [dragged, setDragged] = useState(false);
  const dragDistanceRef = useRef(0);
  // State for animation
  const [animatedCards, setAnimatedCards] = useState<boolean[]>([]);

  // Initialize animation when projects are loaded
  useEffect(() => {
    if (projects.length > 0) {
      const filteredProjects = projects.sort((a,b) => b.num - a.num).filter((p)=>p.listing);
      const initialAnimationState = new Array(filteredProjects.length).fill(false);
      setAnimatedCards(initialAnimationState);
      
      // Trigger animation for each card with staggered delay
      filteredProjects.forEach((_, index) => {
        setTimeout(() => {
          setAnimatedCards(prev => {
            const newState = [...prev];
            newState[index] = true;
            return newState;
          });
        }, index * 100); // 100ms delay between each card
      });
    }
  }, [projects]);

  // Mouse drag start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    setDragged(false);
    dragDistanceRef.current = 0;
  };
  // Mouse drag move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.2; // Adjust scroll speed
    dragDistanceRef.current += Math.abs(x - startX);
    if (dragDistanceRef.current > 5) setDragged(true); // If moved more than 5px, treat as drag
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };
  // Mouse drag end
  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => setDragged(false), 50); // Reset dragged after short delay
  };

  // Touch drag start
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setTouchStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setTouchScrollLeft(scrollRef.current.scrollLeft);
    setDragged(false);
    dragDistanceRef.current = 0;
  };
  // Touch drag move
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - touchStartX) * 1.2;
    dragDistanceRef.current += Math.abs(x - touchStartX);
    if (dragDistanceRef.current > 5) setDragged(true); // If moved more than 5px, treat as drag
    scrollRef.current.scrollLeft = touchScrollLeft - walk;
  };
  // Touch drag end
  const handleTouchEnd = () => {
    setIsDragging(false);
    setTimeout(() => setDragged(false), 50); // Reset dragged after short delay
  };

  // Scroll right by button
  const handleScrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  // Keyboard accessibility for arrow button
  const handleArrowKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleScrollRight();
    }
  };

  // Handle card click: only trigger if not dragged
  const handleCardClick = (project: Project) => {
    if (!dragged) {
      onProjectClick(project);
    }
  };

  return (
    <div className="relative pb-[120px] mt-14">
      <div ref={ref} className="bg-white max-w-[1440px] mx-auto px-4 pt-4">
        <h2 className="text-4xl font-medium">{t('top.projects.heading')}</h2>
        <hr className="my-4 h-0.5 border-t-0 bg-[#BFC9D480]" />
      </div>
      {/* Horizontal scrollable project card list with drag events */}
      <div
        ref={scrollRef}
        className="w-screen overflow-x-auto whitespace-nowrap scrollbar-hide px-4 -mx-4 h-[220px] flex items-center gap-4 cursor-grab select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="region"
        aria-label={t('top.projects.ariaList')}
      >
        {projects.sort((a,b) => b.num - a.num).filter((p)=>p.listing).map((project, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(project)}
            className={`
              ${index === 0 ? 'ml-[calc((100vw-1440px)/2+16px)] max-lg:ml-4' : ''}
              transform transition-all duration-500 ease-out relative z-10 hover:z-40
              ${animatedCards[index] 
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-full opacity-0'
              }
            `}
          >
            {project && (
              <ProjectCard
                project={project}
                lng={lng}
              />
            )}
          </div>
        ))}
      </div>
      {/* Right arrow button for scrolling, absolutely positioned and fixed relative to the card list height */}
      <button
        className="absolute right-6 top-[calc(50%-15px)] -translate-y-1/3 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center z-[41] border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        onClick={handleScrollRight}
        tabIndex={0}
        aria-label={t('top.projects.ariaScrollRight')}
        onKeyDown={handleArrowKey}
        type="button"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Chevron arrow icon in a circle */}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* <circle cx="14" cy="14" r="13" stroke="#BFC9D4" strokeWidth="2" fill="white" /> */}
          <path d="M11 9L16 14L11 19" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
});

Projects.displayName = 'Projects';

export default Projects;