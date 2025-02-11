// ==UserScript==
// @name        MusicBrainz: Semi-automate adding "remixer" and "remix of" credits
// @version     2021.11.09.1
// @description Adds links to the relationship editor that semi-automate adding "remixer" and "remix-of" credits
// @author      atj
// @license     MIT; https://opensource.org/licenses/MIT
// @namespace   https://github.com/atj/userscripts
// @downloadURL https://raw.github.com/atj/userscripts/master/mb_add_remix_credit_links.user.js
// @updateURL   https://raw.github.com/atj/userscripts/master/mb_add_remix_credit_links.user.js
// @match       *://*.musicbrainz.org/release/*/edit-relationships
// @grant       none
// @run-at      document-idle
// ==/UserScript==

/* Examples of track titles that this regex should match:
 *
 * Nepalese Bliss (Jimpster mix)
 * Earth Is the Place (FK edit)
 * Right by Your Side (Restless Soul Aquarius mix)
 * Animal (DJ Martin & DJ Homes' Primordial Jungle mix)
 * Hotline Riddim (Jacques Renault edit)
 * Master Boogie Song & Dance - Roll the Joint (Joey Negro re-edit)
 * I Got It (Kenny Dope edit)
 * Manzel - It's Over Now (MAW remix dub)
 * Open Your Eyes (New Phunk Theory's Little Green dub)
 * Black Truffles in the Snow (Mike Huckaby's S Y N T H remix)
 * Yes, No, Maybe (Sterac Electronics instrumental remix)
 * The Rainbow Song (Crackazat rework)
 */
const TitleRemixRegexp =
    /^\s*(.+)\s+\(\s*(.+)\s+(?:(?:re)?mix|re-?(?:[dr]ub|edit|work)|edit).*\)/i;

const AddIconUri = 'https://staticbrainz.org/MB/add-e585eab.png';
// <option value="153">&nbsp;&nbsp;remixer</option>
const RemixerOptionValue = '153';
// <option value="230">&nbsp;&nbsp;remix of</option>
const RemixOfOptionValue = '230';

// This code is based on:
// https://stackoverflow.com/questions/42795059/programmatically-fill-reactjs-form
function setElementValue(element, value, event = 'input') {
    const propertyDescriptor = Object.getOwnPropertyDescriptor(
        element,
        'value'
    );
    const valueSetter =
        propertyDescriptor === undefined ? null : propertyDescriptor.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(
        prototype,
        'value'
    ).set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
    } else {
        valueSetter.call(element, value);
    }

    element.dispatchEvent(new Event(event, { bubbles: true }));
}

function addStyleElement() {
    const style = document.createElement('style');
    style.type = 'text/css';
    document.head.appendChild(style);
    style.appendChild(
        document.createTextNode('.add-rc { display: inline-block; }')
    );
}

function addRemixCreditLinks() {
    const recordings = document.getElementsByClassName('recording');
    const releaseArtists = Array.from(
        document
            .getElementsByClassName('subheader')[0]
            .getElementsByTagName('bdi')
    )
        .slice(0, -1) // slice "see all versions of this release"
        .map(bdi => bdi.innerText);

    for (const recording of recordings) {
        const title = recording.getElementsByTagName('bdi')[0].innerText;
        let matches = TitleRemixRegexp.exec(title);
        if (matches === null) {
            continue;
        }

        let linkTypes = {};
        // find existing relationship types for this recording
        for (const link of recording.getElementsByClassName('link-phrase')) {
            linkTypes[link.innerText] = 1;
        }

        let span = document.createElement('span');
        if (linkTypes['remixer']) {
            span.className = 'add-rc btn disabled';
        } else {
            span.className = 'add-rc btn';
            span.onclick = addRemixCreditClickHandler;
            span.setAttribute('data-remixer', matches[2]);
        }

        span.innerHTML = `
            <img class="bottom" src="${AddIconUri}">
            Add "remixer" credit
        `;
        recording.appendChild(span);
        recording.appendChild(document.createTextNode('\n'));

        span = document.createElement('span');
        if (linkTypes['remix of']) {
            span.className = 'add-rc btn disabled';
        } else {
            let trackArtists = Array.from(
                recording
                    .getElementsByTagName('span')[1]
                    .getElementsByTagName('bdi')
            ).map(bdi => bdi.innerText);
            if (!trackArtists.length) {
                trackArtists = releaseArtists;
            }
            // recording search will be pre-filled with title and artists to improve the results
            const recordingQuery = `${matches[1]} ${trackArtists.join(' ')}`;

            span.className = 'add-rc btn';
            span.onclick = addRemixCreditClickHandler;
            span.setAttribute('data-remix-of', recordingQuery);
        }

        span.innerHTML = `
            <img class="bottom" src="${AddIconUri}">
            Add "remix of" credit
        `;
        recording.appendChild(span);
    }
}

function addRemixCreditClickHandler(event) {
    event.preventDefault();

    const recording = this.parentElement;
    const remixer = this.getAttribute('data-remixer');
    const remixOf = this.getAttribute('data-remix-of');

    const addRel = recording.getElementsByClassName('add-rel')[0];
    addRel.click();

    if (remixer) {
        // wait 250ms for the dialog to be added to the DOM
        window.setTimeout(function () {
            const dialog = document.getElementById('dialog');
            const linkType = dialog.getElementsByClassName('link-type')[0];
            setElementValue(linkType, RemixerOptionValue, 'change');

            const name = dialog.getElementsByClassName('name')[0];
            if (remixer) {
                setElementValue(name, remixer);
            } else {
                name.focus();
            }
        }, 250);
    } else if (remixOf) {
        // wait 250ms for the dialog to be added to the DOM
        window.setTimeout(function () {
            const dialog = document.getElementById('dialog');
            const entityType = dialog.getElementsByClassName('entity-type')[0];
            setElementValue(entityType, 'recording', 'change');

            // wait another 250ms for the link-type select options to be updated
            window.setTimeout(function () {
                const linkType = dialog.getElementsByClassName('link-type')[0];
                setElementValue(linkType, RemixOfOptionValue, 'change');

                const name = dialog.getElementsByClassName('name')[0];
                if (remixOf) {
                    setElementValue(name, remixOf);
                } else {
                    name.focus();
                }
            }, 250);
        }, 250);
    }
}

// wait 500ms for the page to fully initialise
window.setTimeout(function () {
    addStyleElement();
    addRemixCreditLinks();
}, 500);
