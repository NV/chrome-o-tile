const CHROME = navigator.appVersion.match(/Chrome\/[^ ]+/)[0];
const OS = navigator.appVersion.match(/\(([^)]+)/)[1];
console.info(CHROME, OS);
