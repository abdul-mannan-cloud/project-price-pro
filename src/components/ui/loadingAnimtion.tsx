import React from "react";

const CubeLoader = () => {
  // Define our cube heights, widths, and lengths
  const dimensions = {
    h: [1, 2, 3],
    w: [1, 2, 3],
    l: [1, 2, 3],
  };

  // Define the colors (equivalent to SCSS variables)
  const colors = {
    background: "transparent",
    leftFace: "#D53A33",
    rightFace: "#E79C10",
    topFace: "#1d9099",
  };

  // Create CSS for animation keyframes
  const generateKeyframes = () => {
    let styles = "";

    for (const h of dimensions.h) {
      for (const w of dimensions.w) {
        for (const l of dimensions.l) {
          styles += `
            @keyframes h${h}w${w}l${l} {
              0% {
                transform: translate(${w * -50 - 50 + (l * 50 + 50)}%, ${h * 50 - 200 + (w * 25 - 25) + (l * 25 + 25)}%);
              }
              14% {
                transform: translate(${w * -50 - 50 + (l * 100 - 50)}%, ${h * 50 - 200 + (w * 25 - 25) + (l * 50 - 25)}%);
              }
              28% {
                transform: translate(${w * -100 + 50 + (l * 100 - 50)}%, ${h * 50 - 200 + (w * 50 - 75) + (l * 50 - 25)}%);
              }
              43% {
                transform: translate(${w * -100 - 100 + (l * 100 + 100)}%, ${h * 100 - 400 + (w * 50 - 50) + (l * 50 + 50)}%);
              }
              57% {
                transform: translate(${w * -100 - 100 + (l * 50 + 200)}%, ${h * 100 - 400 + (w * 50 - 50) + (l * 25 + 100)}%);
              }
              71% {
                transform: translate(${w * -50 - 200 + (l * 50 + 200)}%, ${h * 100 - 375 + (w * 25 - 25) + (l * 25 + 100)}%);
              }
              85% {
                transform: translate(${w * -50 - 50 + (l * 50 + 50)}%, ${h * 50 - 200 + (w * 25 - 25) + (l * 25 + 25)}%);
              }
              100% {
                transform: translate(${w * -50 - 50 + (l * 50 + 50)}%, ${h * 50 - 200 + (w * 25 - 25) + (l * 25 + 25)}%);
              }
            }
          `;
        }
      }
    }

    return <style>{styles}</style>;
  };

  // Render a single cube
  const renderCube = (h, w, l) => {
    const animationName = `h${h}w${w}l${l}`;

    return (
      <div
        key={`${h}${w}${l}`}
        className="absolute w-[86px] h-[100px]"
        style={{
          animation: `${animationName} 3s ease infinite`,
          zIndex: -h,
        }}
      >
        <div
          className="absolute origin-top-left"
          style={{
            height: "50px",
            width: "50px",
            background: colors.topFace,
            transform:
              "rotate(210deg) skew(-30deg) translate(-75px, -22px) scaleY(0.86)",
            zIndex: 2,
          }}
        ></div>
        <div
          className="absolute origin-top-left"
          style={{
            height: "50px",
            width: "50px",
            background: colors.leftFace,
            transform:
              "rotate(90deg) skewX(-30deg) scaleY(0.86) translate(25px, -50px)",
          }}
        ></div>
        <div
          className="absolute origin-top-left"
          style={{
            height: "50px",
            width: "50px",
            background: colors.rightFace,
            transform:
              "rotate(-30deg) skewX(-30deg) translate(49px, 65px) scaleY(0.86)",
          }}
        ></div>
      </div>
    );
  };

  // Create a container for each height
  const renderHeightContainer = (height) => {
    return (
      <div key={`h${height}Container`} className="relative">
        {dimensions.w.map((width) =>
          dimensions.l.map((length) => renderCube(height, width, length)),
        )}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col justify-center items-center m-0 p-0 h-[80vh] w-full"
      style={{ background: colors.background }}
    >
      {generateKeyframes()}
      <div className="relative h-[100px] w-[86px] scale-[40%] mb-16">
        {dimensions.h.map((height) => renderHeightContainer(height))}
      </div>
      <span className="text-center">Building your custom estimate...</span>
    </div>
  );
};

export default CubeLoader;
