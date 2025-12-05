import React from "react";

const DesktopVideoBackground = () => {
  return (
    <div className="h-dvh w-svw hidden xl:block fixed left-0 right-0 top-0 bottom-0 -z-10">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-cover"
      >
        <source src={'/videos/pc_pale_high.mp4'} type="video/mp4" />
      </video>
    </div>
  );
};

export default DesktopVideoBackground;
