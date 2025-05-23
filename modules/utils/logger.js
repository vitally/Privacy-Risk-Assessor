import { DateTime } from 'luxon';

function getTimestamp() {
  return `[${DateTime.now().toFormat('dd.MM.yyyy HH:mm:ss')}]`;
}

export function logInfo(message) {
  process.stdout.write(`${getTimestamp()} INFO: ${message}\n`);
}

export function logError(message, error) {
  let errorMessage = `${getTimestamp()} ERROR: ${message}`;
  if (error && error instanceof Error) {
    errorMessage += `\n${error.stack}`;
  } else if (error) {
    errorMessage += ` ${JSON.stringify(error)}`;
  }
  process.stderr.write(`${errorMessage}\n`);
}

// For testing purposes, if needed
// logInfo('This is an info message.');
// logError('This is an error message without an error object.');
// logError('This is an error message with an error object.', new Error('Something went wrong'));
