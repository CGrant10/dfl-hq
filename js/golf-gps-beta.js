import { setupCourseGps } from "./golf-gps-course-map.js";

export const golfGpsBetaEnabled=true;
setupCourseGps({
  key:"center",
  label:"Square Butte Creek Golf Course · Center, ND",
  courseRe:/(square\s*butte|center\s*(nd)?|center square butte)/i,
  mapQuery:"Square Butte Creek Golf Course Center North Dakota",
  courseCenter:[47.09366,-101.24942],
  storageKey:"dfl.golfGpsBeta.center.greens.v1"
});
