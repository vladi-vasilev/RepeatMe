import { colors, playerButtons, numberOfButtons, machineButtons, buttonCooldown, startDelay, imgOn, imgOff, audioList } from './config.js';

class Game {
    constructor(rootElement) {
        this.rootElement = rootElement;
        this.coloredButtonsArr = [];
        this.startButtonElement = null;
        this.stateTextElement = null;
        this.isMuted = false;
        this.createElements();
        this.resetGame();
    }

    createElements() {
        this.createMuteButton();
        this.startButtonElement = this.createStartButton();
        this.stateTextElement = this.createStateSection();
        this.createColoredButtonsSection();
        this.createRulesSection();
    }

    createMuteButton() {
        let div = document.createElement('div');
        div.classList.add('menu-buttons');

        let img = document.createElement('img');
        img.classList.add('mute');
        img.dataset.muteButton = '';
        img.src = imgOn;
        img.alt = 'icon for sound ON or OFF';

        img.addEventListener('click', () => this.handleMuteButtonClick(img));

        div.appendChild(img);
        this.rootElement.appendChild(div);
    }

    createStartButton() {
        let element = this.createButtonElement(['startBtn'], 'Start', '', '', '');

        element.addEventListener('click', () => this.startGame());

        this.rootElement.appendChild(element);
        return element;
    }

    createStateSection() {
        let div = document.createElement('div');
        div.classList.add('state-container');

        let h1 = document.createElement('h1');
        // h1.dataset.state = '';
        h1.innerHTML = 'Push start for a new game.'

        div.appendChild(h1);

        this.rootElement.appendChild(div);
        return h1;
    }

    createColoredButtonsSection() {
        let div = document.createElement('div');
        div.classList.add('button-contaier');

        for (let i = 0; i < numberOfButtons; i++) {
            let button = this.createButtonElement([colors[i]], '', i, 'colorButton');
            button.addEventListener('click', () => this.handleColorButtonClick(button));
            this.coloredButtonsArr.push(button);
            div.appendChild(button);
        }

        this.rootElement.appendChild(div);
    }

    createRulesSection() {
        let div = document.createElement('div');
        div.classList.add('rules-contaier');

        let p = document.createElement('p');
        p.classList.add('rule');
        p.innerHTML = '<span>*</span>Repeat the squence by clicking the colored buttons in the same order.';

        div.appendChild(p);

        this.rootElement.appendChild(div);
    }

    createButtonElement(classListArr, innerHtmlText, value, datasetKey, datasetValue = '') {
        let button = document.createElement('button');
        classListArr.forEach(classText => {
            button.classList.add(classText);
        });
        button.innerHTML = innerHtmlText;
        button.type = 'button';
        button.dataset[datasetKey] = datasetValue;

        if (value !== '')
            button.value = value;

        return button;
    }

    createContaierElement(classListArr, datasetKey, datasetValue) {
        let div = document.createElement('div');

        classListArr.forEach(classText => {
            div.classList.add(classText);
        });

        div.dataset[datasetKey] = datasetValue;

        return div;
    }

    resetGame() {
        this.playerSequence = '';
        this.secretSequence = '';
        this.secretSequenceLength = 1;
        this.isGameOver = false;
        this.gameStarted = false;
        this.isPlayersTurn = true;
        this.isCorrect = false;
        this.clearActiveTimeouts();
        this.resetButtons();
    }

    startGame() {
        this.resetGame();
        this.gameStarted = true;
        this.listen();
    }

    async listen() {
        this.isPlayersTurn = false;
        this.updateUI();

        this.secretSequence = this.sequenceGenerator(this.secretSequence, this.secretSequenceLength, numberOfButtons);

        await this.timeout(startDelay);

        // console.log('secretSequence', this.secretSequence);

        for (let i = 0; i < this.secretSequence.length; i++) {
            if (i !== 0) {
                await this.timeout(buttonCooldown);
            }

            await this.activateColorButton(this.coloredButtonsArr[this.secretSequence[i]], machineButtons);
        }

        await this.timeout(buttonCooldown);
        this.isPlayersTurn = true;
        this.updateUI();
    }

    sequenceGenerator(secretSequence, sequenceLength, limit) {
        do {
            secretSequence = secretSequence + this.getRandomDigit(limit).toString();
        } while (secretSequence.length < sequenceLength);

        return secretSequence;
    }

    // Returns a random whole number from 0 to limit - 1
    getRandomDigit(limit) {
        return Math.floor(Math.random() * limit);
    }
   
    async activateColorButton(button, amount) {
        this.playAudio(button.value);
        await this.highlightButton(button, amount);
    }

    playAudio(buttonId) {
        if (!this.isMuted) {
            if (!audioList[buttonId].ended) {
                audioList[buttonId].pause();
                audioList[buttonId].currentTime = 0.08;
            }
            audioList[buttonId].play();
        }
    }

    async highlightButton(button, amount) {
        button.classList.add('active');

        await this.timeout(amount);

        button.classList.remove('active');
    }

    async handleColorButtonClick(button) {
        if (!this.isPlayersTurn) return;

        button.disabled = !button.disabled;

        this.addToPlayerSequence(button.value);
        await this.activateColorButton(button, playerButtons);

        button.disabled = !button.disabled;
    }

    addToPlayerSequence(buttonId) {
        if (this.gameStarted && !this.isGameOver) {
            this.playerSequence += buttonId;

            if (!this.checkInput()) {
                this.isGameOver = true;
                this.gameStarted = false;
                this.updateUI();
                return;
            }

            // console.log(this.playerSequence);
            this.checkLength();
        }
    }

    updateUI() {
        if (this.isCorrect) {
            return this.stateTextElement.innerHTML = 'Good';
        }

        if (!this.isGameOver) {
            this.startButtonElement.innerHTML = 'Restart';
            return this.stateTextElement.innerHTML = this.isPlayersTurn ? 'Repeat' : 'Listen';
        } else {
            this.startButtonElement.innerHTML = 'Try again';
            return this.stateTextElement.innerHTML = 'Game over';
        }
    }

    async checkLength() {
        if (this.secretSequence.length === this.playerSequence.length) {
            this.playerSequence = '';
            this.secretSequenceLength++;
            this.isCorrect = true;
            this.updateUI();
            this.isPlayersTurn = false;
            await this.timeout(machineButtons);
            this.isCorrect = false;
            this.listen();
        }
    }

    checkInput() {
        const index = this.playerSequence.length - 1;

        return this.secretSequence[index] === this.playerSequence[index];
    }

    handleMuteButtonClick(element) {
        element.src = this.toggleSound() ? imgOff : imgOn;
    }

    toggleSound() {
        return this.isMuted = !this.isMuted;
    }

    timeout(amount) {
        return new Promise(resolve => {
            this.activeTimeout = setTimeout(() => {
                resolve();
                this.activeTimeout = null;
            }, amount);
        });
    }

    clearActiveTimeouts() {
        if (this.activeTimeout != null) {
            clearTimeout(this.activeTimeout);
        }
    }

    resetButtons() {
        this.coloredButtonsArr.forEach(button => {
            button.classList.remove('active');
        });
    }
}

export default Game;