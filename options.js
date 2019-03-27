let elements = document.getElementsByTagName('a');
for(let i = 0, len = elements.length; i < len; i++) {
    elements[i].onclick = function () {
        browser.tabs.create({url: this.href}).then();
    }
}

document.getElementById('options-form').addEventListener("submit", function (e) {
    e.preventDefault();

    document.getElementById('error-max-virus-next').style.display = 'none';
    document.getElementById('error-max-virus').style.display = 'none';

    let max_virus = document.getElementById('max_virus').value;
    let max_virus_next = document.getElementById('max_virus_next').value;
    let audio = false;
    let background = false;

    let err = false;

    if (document.getElementById('audio').checked) {
        audio = true;
    }

    if (document.getElementById('background').checked) {
        background = true;
    }

    max_virus = Number(max_virus);
    max_virus_next = Number(max_virus_next);

    if (max_virus > 50 || max_virus < 20) {
        document.getElementById('error-max-virus').style.display = 'block';
        err = true;
    }

    if (max_virus_next > 50 || max_virus_next < 0) {
        document.getElementById('error-max-virus-next').style.display = 'block';
        err = true;
    }

    if (!err) {
        let settings = {
            'maxVirus': max_virus,
            'reSpan': max_virus_next,
            'audio': audio,
            'background': background
        };

        browser.storage.local.set({settings: settings}).then(function () {
            loadOptions();
            alert('Settings Saved Successfully');
        }, function () {
            alert('Unexpected Error');
        });
    }
});


function loadOptions() {
    browser.storage.local.get('settings').then(function (value) {
        let settings = value['settings'];

        document.getElementById('max_virus').value = settings.maxVirus;
        document.getElementById('max_virus_next').value = settings.reSpan;

        document.getElementById('background').checked = settings.background;
        document.getElementById('audio').checked = settings.audio;
    });
}

loadOptions();