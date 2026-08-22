import { setupCourseGps } from "./golf-gps-course-map.js";

setupCourseGps({
  key:"rolla",
  label:"Rolla Country Club · Rolla, ND",
  courseRe:/(rolla\s*(country|municipal)?|rolla.*golf)/i,
  mapQuery:"Rolla Country Club Rolla North Dakota",
  courseCenter:[48.89628,-99.68236],
  holeTargets:{
    1:{lat:48.8950784,lng:-99.6823172},
    2:{lat:48.8978458,lng:-99.682285},
    3:{lat:48.8994327,lng:-99.6841518},
    4:{lat:48.8978388,lng:-99.6841518},
    5:{lat:48.8949373,lng:-99.683669},
    6:{lat:48.8943237,lng:-99.6805791},
    7:{lat:48.8974297,lng:-99.6794204},
    8:{lat:48.8933361,lng:-99.6796779},
    9:{lat:48.8939075,lng:-99.6834115}
  },
  storageKey:"dfl.golfGpsBeta.rolla.greens.v1"
});
