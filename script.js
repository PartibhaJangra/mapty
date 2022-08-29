'use strict';

// class to store common data
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in mins
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = +elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////////////////////////////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent; // stores data of click event happened on map
  #workouts = []; // array of workout

  constructor() {
    // Get user's position
    // as soon as the pg is refrshed/loaded getPosition() is called
    this._getPosition();

    // Get local storage data and display the historic workouts on LHS
    this._getLocalStorage();

    // AttachEvent handlers
    // these event listeners should be called as soon as the script loads
    form.addEventListener('submit', this._newWorkout.bind(this));
    // change input type based on selection (running / cycling)
    inputType.addEventListener('change', this._toggleElevationField);

    // show the selected workout on the map
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // method determins the curr pos and calls _loadMap() with the pos to load map
  _getPosition() {
    if (navigator.geolocation) {
      // JS will call loadmap() with postion as arg as soon as the curr pos of user is determined
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // if getCurrentPosition() is successfull
        function () {
          alert('Could not get current location!');
        }
      );
    }
  }

  // displaying map on screen with current position
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude}.${longitude}`);

    const coords = [latitude, longitude];

    // map is the element in html of which the map is attached
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // map is made up of tiles
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling click even on map
    this.#map.on('click', this._showForm.bind(this));

    // Create marker for local storage objects
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    // display form on map click
    form.classList.remove('hidden');
    inputDistance.focus(); // as soon as we click on the map, cursor should point at distance field in form
  }

  _hideForm() {
    // empty the inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none'; // hides the form completely
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000); // display the form after 1ms so that animation is done by then
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // submitting the form for a workout will create a new workout
  _newWorkout(e) {
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp)); // helper fun
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // every() -> iterates through ele from array and return true if all the iterations results true else false

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // + -> converting string to num
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid using guard clause
      if (
        //   !Number.isFinite(distance) ||
        //   !Number.isFinite(duration) ||
        //   !Number.isFinite(cadence)
        !validInput(distance, duration, cadence) &&
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be a positive number!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = inputElevation.value;
      // Check if data is valid using guard clause
      if (
        !validInput(distance, duration, elevation) &&
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be a positive number!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // Render workout on map as marker
    // display marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields(reset the values on form submission)
    this._hideForm();

    // Set local storage for all the workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id=${workout.id}>
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">min</span>
            </div>
    `;
    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
              <span class="workout__icon">⚡️</span>
              <span class="workout__value">${workout.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
              <span class="workout__icon">⛰</span>
              <span class="workout__value">${workout.elevationGain}</span>
              <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // show that particular workout on the map
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: true,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    // initially #workout is empty obj. When called _getLocalStorage() in constructor, #workouts is assigned to data stored in local storage
    // and new workout are appended to that
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
      // this._renderWorkoutMarker(workout); // error, bcoz trying to add marker to map which is not defined yet at this pt (when the app is first loaded)
    });
  }

  // Public method to empty local storage ; Public Interface
  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // reload page
  }
}

const app = new App();
