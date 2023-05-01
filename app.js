/**
 * Variables
 */
const submitBtn = document.querySelector('.submit-btn');
const fortifiedDungeonList = document.querySelector('.fortified-runs');
const tyrannicalDungeonList = document.querySelector('.tyrannical-runs');
const allDungeonList = document.querySelector('.keystone-runs');

/**
 * Event Listeners
 */
submitBtn.addEventListener('click', () => {
  const regionList = document.querySelector('.regions');
  const realm = document.querySelector('.realm-text');
  const charName = document.querySelector('.char-text');
  if (realm.value == '' || charName.value == '') {
    displayErrorMessage('You must fill in all required fields before submitting');
  } else {
    // 9 = Dragonflight ID
    fetchStaticDungeonData(9).then((staticData) => {
      if (staticData.statusCode === 400) {
        displayErrorMessage(staticData.message);
      } else {
        fetchCharacterData(regionList.value, realm.value, charName.value).then((charData) => {
          if (charData.statusCode === 400) {
            displayErrorMessage(charData.message);
          } else {
            displayIntro(charData);
            deleteDungeonData();
            processDungeonData(charData, staticData);
            if (charData.mythic_plus_scores_by_season[0].scores.all < 2000) {
              recommendDungeonToImprove(fortifiedDungeonList.children, tyrannicalDungeonList.children);
            }
          }
        });
      }
    });
  }
});

allDungeonList.addEventListener('click', (e) => {
  redirectToRaiderio(e.composedPath()[0].getAttribute('id'));
});

/**
 * fetchStaticDungeonData(): Fetches the Promise, resolves to the Response object, and converts it to JSON in order to read the data provided by Raider.io
 *
 * @param {Integer} id: the expansion ID
 *
 * @returns A JSON object containing static dungeon data for the current M+ season
 */
async function fetchStaticDungeonData(id) {
  const response = await fetch(`https://raider.io/api/v1/mythic-plus/static-data?expansion_id=${id}`);

  const json = await response.json();
  return json;
}

/**
 * fetchCharacterData(): Fetches the Promise, resolves to the Response object, and converts it to JSON in order to read the data provided by Raider.io
 *
 * @param {String} region: the selected region
 * @param {String} realm: realm string
 * @param {String} char: character name string
 *
 * @returns A JSON object containing information pertaining to inputted character
 */
async function fetchCharacterData(region, realm, char) {
  const response = await fetch(
    `https://raider.io/api/v1/characters/profile?region=${region}&realm=${realm}&name=${char}&fields=mythic_plus_ranks,mythic_plus_scores_by_season:current,mythic_plus_best_runs,mythic_plus_alternate_runs`
  );

  const json = await response.json();
  return json;
}

/**
 * displayIntro(): Sets the UI to show the character thumbnail, character name, their mythic+ score, and a message stating whether the player has achieved KSM or not
 *
 * @param {Object} data: JSON object fetched from Raider.io
 */
function displayIntro(data) {
  const dataDisplay = document.querySelector('.data-display');
  if (data.mythic_plus_scores_by_season[0].scores.all >= 2000) {
    dataDisplay.innerHTML = `
    <div class="char-results">
      <img src="${data.thumbnail_url}" alt="World of Warcraft character thumbnail"></img>
      <h4>${data.name}</h4>
      <h4>Mythic+ Score: <span class="mythic-score-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">${data.mythic_plus_scores_by_season[0].scores.all}</span></h4>
    </div>
    <div class="char-mythic-text">
      <h2>You are a <span class="keystone-master-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">Keystone Master</span>!</h2>
    </div>`;
  } else {
    dataDisplay.innerHTML = `
    <div class="char-results">
      <img src="${data.thumbnail_url}" alt="World of Warcraft character thumbnail"></img>
      <h4>${data.name}</h4>
      <h4>Mythic+ Score: <span class="mythic-score-text" style="color: ${data.mythic_plus_scores_by_season[0].segments.all.color}">${data.mythic_plus_scores_by_season[0].scores.all}</span></h4>
    </div>
    <div class="char-mythic-text">
      <h2>You're not quite a Keystone Master just yet. Check and see which dungeons you need to improve below.</h2>
    </div>`;
  }
}

/**
 * recommendDungeonToImprove(): Inserts an arrow icon to the top left of the dungeon div, serving as an indicator to the user that the dungeon score can be improved in order to obtain KSM
 *
 * @param {Object} fortifiedDungeons: the fortified dungeon list
 * @param {Object} tyrannicalDungeons: the tyrannical dungeon list
 */
function recommendDungeonToImprove(fortifiedDungeons, tyrannicalDungeons) {
  for (let i = 0; i < fortifiedDungeons.length; i++) {
    const scoreString = fortifiedDungeons[i].children[4].innerHTML;
    const score = Number(scoreString.replace(/[^0-9\.]+/g, ''));
    if (score < 125) {
      fortifiedDungeons[i].children[0].style.display = 'block';
    }
  }
  for (let i = 0; i < tyrannicalDungeons.length; i++) {
    const scoreString = tyrannicalDungeons[i].children[4].innerHTML;
    const score = Number(scoreString.replace(/[^0-9\.]+/g, ''));
    if (score < 125) {
      tyrannicalDungeons[i].children[0].style.display = 'block';
    }
  }
}

/**
 * processDungeonData(): Obtains the JSON data to append the needed divs to keystone-best-runs and update the UI
 *
 * @param {Object} charData: JSON object fetched from API
 * @param {Object} staticData: JSON object fetched from API
 */
function processDungeonData(charData, staticData) {
  // create a keystone-dungeon div
  console.log(charData);
  console.log(staticData);
  const keystoneDungeon = createDungeonDiv();

  // show the keystone info section
  const keystoneInfoSection = document.querySelector('.keystone-info');
  keystoneInfoSection.style.display = 'block';

  // append divs to fortified-runs and tyrannical-runs
  const fortifiedList = document.querySelector('.fortified-runs');
  const tyrannicalList = document.querySelector('.tyrannical-runs');
  appendDivCopies(staticData, keystoneDungeon, fortifiedList, 'F');
  appendDivCopies(staticData, keystoneDungeon, tyrannicalList, 'T');

  // sort the dungeons by affix
  const tyrannicalRuns = filterDungeonByAffix(charData.mythic_plus_best_runs.concat(charData.mythic_plus_alternate_runs), 'Tyrannical');
  const fortifiedRuns = filterDungeonByAffix(charData.mythic_plus_best_runs.concat(charData.mythic_plus_alternate_runs), 'Fortified');

  console.log(tyrannicalRuns);

  // get all keystone-dungeon elements
  const keystoneDungeonDivsFort = document.getElementsByClassName('keystone-dungeon-fortified');
  const keystoneDungeonDivsTyran = document.getElementsByClassName('keystone-dungeon-tyrannical');

  console.log(keystoneDungeonDivsFort);
  // insert the data into the UI
  insertDungeonData(keystoneDungeonDivsFort, fortifiedRuns);
  insertDungeonData(keystoneDungeonDivsTyran, tyrannicalRuns);
}

/**
 * filterDungeonByAffix(): filters the JSON data to only contain dungeons that include a specific affix
 *
 * @param {Object} dungeonList: JSON object fetched from API
 * @param {String} affix: the affix we want to filter by
 *
 * @return a JSON object containing only the dungeons with the filtered affix
 */
function filterDungeonByAffix(dungeonList, affix) {
  const result = dungeonList.filter((item) => {
    if (item.affixes[0].name === affix) {
      return true;
    } else {
      return false;
    }
  });

  return result;
}

/**
 * insertDungeonData(): Updates the UI to show the players best M+ runs, displaying the dungeon name, keystone level, upgrade level, affixes, time completed, and score
 *
 * @param {Object} dungeons: a list of keystone-dungeon divs
 * @param {Object} dungeonList: JSON object containing the characters mythic+ * data
 */
function insertDungeonData(dungeons, dungeonList) {
  for (let i = 0; i < dungeons.length; i++) {
    for (let j = 0; j < dungeonList.length; j++) {
      if (dungeonList[j].short_name === dungeons[i].id.substring(0, dungeons[i].id.lastIndexOf('-'))) {
        // dungeon name and upgrade level
        dungeons[i].children[1].innerHTML = `${keystoneUpgrade(dungeonList[j].num_keystone_upgrades)}${dungeonList[j].mythic_level} ${dungeonList[j].dungeon}`;

        // affixes
        dungeons[i].children[2].innerHTML = `${dungeonList[j].affixes[0].name}, ${dungeonList[j].affixes[1].name}, ${dungeonList[j].affixes[2].name}, ${dungeonList[j].affixes[3].name}`;

        // clear time
        // add indication in UI if keystone was over time
        if (dungeonList[j].clear_time_ms < dungeonList[j].par_time_ms) {
          dungeons[i].children[3].innerHTML = `Time: ${msToTime(dungeonList[j].clear_time_ms)}`;
        } else {
          dungeons[i].children[3].innerHTML = `Time: ${msToTime(dungeonList[j].clear_time_ms)} (over time)`;
        }

        // score
        dungeons[i].children[4].innerHTML = `Score: ${dungeonList[j].score}`;
      }
    }
    // check if div is still empty
    if (dungeons[i].children[1].innerHTML === '') {
      dungeons[i].children[1].innerHTML = 'Incomplete';
    }
  }
}

/**
 * setDungeonBackground(): Sets the background of a keystone-dungeon div with its' appropriate image
 *
 * @param {String} name: short-hand name of the specific dungeon
 *
 * @return A string of the background image css style with the correct dungeon image
 */
function setDungeonBackground(name) {
  switch (name) {
    case 'AA':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/algethar.jpg)';
    case 'COS':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/courtofstars.jpg)';
    case 'HOV':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/hallsofvalor.jpg)';
    case 'RLP':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/rubylifepools.jpg)';
    case 'SBG':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/shadowmoon.jpg)';
    case 'TJS':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/templejade.jpg)';
    case 'AV':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/azurevault.jpg)';
    case 'NO':
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8)), url(img/nokhud.jpg)';
    default:
      return 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.5)), url(img/algethar.jpg)';
  }
}

/**
 * addDungeonDiv(): Creates the keystone-dungeon div
 */
function createDungeonDiv() {
  // create the div
  const keystoneDungeon = document.createElement('div');
  keystoneDungeon.className = 'keystone-dungeon';
  keystoneDungeon.innerHTML =
    '<div class="arrow-icon">' +
    '<i class="fa-regular fa-circle-up arrow-icon"></i>' +
    '<p class="arrow-icon-text">Improve this dungeon to up your M+ score</p>' +
    '</div>' +
    '<h3 class="keystone-dungeon-name"></h3>' +
    '<h3 class="keystone-dungeon-affixes"></h3>' +
    '<h3 class="keystone-dungeon-time"></h3>' +
    '<h3 class="keystone-dungeon-score"></h3>';
  return keystoneDungeon;
}

/**
 * deleteDungeonData(): Deletes the current dungeon data from the UI if any such data exists
 */
function deleteDungeonData() {
  const keystoneDungeonDivs = document.getElementsByClassName('keystone-dungeon');
  while (keystoneDungeonDivs.length > 0) {
    keystoneDungeonDivs[0].parentNode.removeChild(keystoneDungeonDivs[0]);
  }
}

/**
 * redirectToRaiderio(): Redirects the user to a new tab, showing the completed dungeon run on Raider.io
 *
 * @param {String} target: The id of the div we clicked on (ex. AA-F)
 */
async function redirectToRaiderio(target) {
  const regionList = document.querySelector('.regions');
  const realm = document.querySelector('.realm-text');
  const charName = document.querySelector('.char-text');
  const dungeonName = target.substring(0, target.lastIndexOf('-'));
  const affix = target.charAt(target.length - 1);
  const data = await fetchCharacterData(regionList.value, realm.value, charName.value);
  const fullData = [...data.mythic_plus_best_runs, ...data.mythic_plus_alternate_runs];

  const targetDiv = fullData.find((item) => {
    const itemAffix = item.affixes[0].name;
    return item.short_name === dungeonName && itemAffix === (affix === 'F' ? 'Fortified' : 'Tyrannical');
  });

  if (targetDiv) {
    window.open(targetDiv.url, '_blank');
  }
}

/**
 * keystoneUpgrade(): Determines the upgrade level of a keystone with '+'symbols
 *
 * @param {Integer} num: keystone upgrade level
 *
 * @return The upgrade level as a string of '+' symbols
 */
function keystoneUpgrade(num) {
  const keyUpgrade = ['', '+', '++', '+++'];
  return keyUpgrade[num];
}

/**
 * appendDivCopies(): Appends nodes to a document element - used for inserting the keystone-dungeon divs into the document
 *
 * @param {Object} data: our static dungeon data
 * @param {Object} original: the node we want to copy
 * @param {Object} appendTo: the node we want to append to
 * @param {String} affix: the fortified/tyrannical affix char(F or T)
 */
function appendDivCopies(data, original, appendTo, affix) {
  for (let i = 0; i < data.seasons[0].dungeons.length; i++) {
    // clone the node
    let clone = original.cloneNode(true);

    // check the affix and add respective class
    if (affix === 'F') {
      clone.className += ' keystone-dungeon-fortified';
    } else {
      clone.className += ' keystone-dungeon-tyrannical';
    }

    // set id and background
    // TODO: CHANGE seasons[1] to seasons[0] for season 2 of Dragonflight
    clone.id = `${data.seasons[1].dungeons[i].short_name}-${affix}`;
    clone.style.backgroundImage = setDungeonBackground(data.seasons[1].dungeons[i].short_name);

    appendTo.appendChild(clone);
  }
}

/**
 * displayErrorMessage(): Displays an error modal in the window
 *
 * @param {String} msg: Error message to display
 */
function displayErrorMessage(msg) {
  const errorBox = document.querySelector('.error-box');
  errorBox.innerHTML = msg;
  errorBox.style.display = 'block';
  setTimeout(function () {
    errorBox.style.display = 'none';
  }, 3000);
}

/**
 * msToTime(): Convert miliseconds to hh:mm:ss.sss UTC format
 *
 * @param {Integer} s: time in miliseconds
 *
 * @returns The time in the specified format above
 */
function msToTime(s) {
  // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  return pad((s / 3.6e6) | 0) + ':' + pad(((s % 3.6e6) / 6e4) | 0) + ':' + pad(((s % 6e4) / 1000) | 0) + '.' + pad(s % 1000, 3);
}
