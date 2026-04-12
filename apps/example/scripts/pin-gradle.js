const fs = require("fs");
const path = require("path");

const wrapperPath = path.join(
  __dirname,
  "../android/gradle/wrapper/gradle-wrapper.properties"
);

let content = fs.readFileSync(wrapperPath, "utf8");
content = content.replace(
  /distributionUrl=.*/,
  "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.3-all.zip"
);
fs.writeFileSync(wrapperPath, content);
console.log("✅ Pinned Gradle to 8.3");