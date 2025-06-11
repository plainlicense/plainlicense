/**
 * @module feedback
 * @description Handles feedback form submission
 * @license Plain Unlicense(Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 */
import { type Observable, filter, fromEvent, map, of, tap, throttleTime } from 'rxjs';
import { isValidEvent, preventDefault } from '~/utils';
import { logger } from '~/utils/log';

/**
 * @exports feedback
 * @function feedback
 * @returns {Observable<Event | null>} Observable that listens for the feedback form submission event, returns null if the form is not found.
 * @description Handles feedback form submission
 */
export const feedback = (): Observable<Event | null> => {
  const feedbackForm = document.forms?.namedItem('feedback');

  if (feedbackForm && feedbackForm instanceof HTMLFormElement) {
    return fromEvent(feedbackForm, 'submit').pipe(
      filter(isValidEvent),
      map((ev) => {
        return ev as SubmitEvent;
      }),
      tap(() => preventDefault),
      throttleTime<SubmitEvent>(3000),
      tap((ev: SubmitEvent) => {
        const page = document.location.pathname;
        const data = ev.submitter?.getAttribute('data-md-value');
        logger.debug(page, data);
        if (
          feedbackForm.firstElementChild &&
          feedbackForm.firstElementChild instanceof HTMLButtonElement
        ) {
          feedbackForm.firstElementChild.disabled = true;
        }
        const note = feedbackForm.querySelector(`.md-feedback__note [data-md-value='${data}']`);
        if (note && note instanceof HTMLElement) {
          note.hidden = false;
        }
      }),
    );
  } else {
    return of(null);
  }
};
