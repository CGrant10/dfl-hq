import { setupCourseGps } from "./golf-gps-course-map.js";

setupCourseGps({
  key:"new-salem",
  label:"Red Trail Links · New Salem, ND",
  courseRe:/(red\s*trail|new\s*salem)/i,
  mapQuery:"Red Trail Links Golf Course New Salem North Dakota",
  storageKey:"dfl.golfGpsBeta.redTrail.greens.v1"
});
