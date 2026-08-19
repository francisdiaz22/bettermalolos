/**
 * City of Malolos barangay directory.
 * Source: DILG Bulacan Local Governance Regional Resource Center.
 */
(function () {
  'use strict';

  const barangays = [
    ['Anilao', 'Ricardo S. Lorenzo'],
    ['Atlag', 'Gerald R. Macario'],
    ['Babatnin', 'Carlito L. Borlongan'],
    ['Bagna', 'Inocencio D.C. Villena'],
    ['Bagong Bayan', 'Feliz Ulric D. Caluag'],
    ['Balayong', 'Ronald B. Bulaong'],
    ['Balite', 'Lolita R. Gatchalian'],
    ['Bangkal', 'Nammer A. Bulaong'],
    ['Barihan', 'Cristopher S. Bernardo'],
    ['Bulihan', 'Luisito C. Zuñiga'],
    ['Bungahan', 'Ariel T. Dayao'],
    ['Caingin', 'Robin C. Cruz'],
    ['Calero', 'Ruben T. Paraiso'],
    ['Caliligawan', 'Jaime A. Magpayo, Jr.'],
    ['Canalate', 'Vicente G. Cruz, Jr.'],
    ['Caniogan', 'Ernesto T. Tobias'],
    ['Catmon', 'James Brian K. Dimagiba'],
    ['Cofradia', 'Rodrigo L. Centneo'],
    ['Dakila', 'Vener C. Dela Cruz'],
    ['Guinhawa', 'Paul Richard D.C. Concepcion'],
    ['Liang', 'Danilo C. Cruz'],
    ['Ligas', 'Marcelo S. Santiago'],
    ['Longos', 'Rizaldy S. Dela Cruz'],
    ['Look 1st', 'Colbert R. Oczon'],
    ['Look 2nd', 'Jaime S. Santiago'],
    ['Lugam', 'Joselito D. San Diego'],
    ['Mabolo', 'Melencio F. Tamayo'],
    ['Mambog', 'Bernardo P. Santiago, Jr.'],
    ['Masile', 'Arnel T. Cabantog'],
    ['Matimbo', 'Marilou S. Cundangan'],
    ['Mojon', 'Michael I. Adriano'],
    ['Namayan', 'Lawrence C. Pinto'],
    ['Niugan', 'Reynaldo V. Bautista'],
    ['Pamarawan', 'Cesar S. Bartolome'],
    ['Panasahan', 'Celerino F. Aniag'],
    ['Pinagbakahan', 'Lorenzo F. Versoza'],
    ['San Agustin', 'Orlando R. Pangindian'],
    ['San Gabriel', 'Arthur A. Mallari'],
    ['San Juan', 'Eugenio M. Fonbuena, Jr.'],
    ['San Pablo', 'Ronaldo D.C. Santos'],
    ['San Vicente', 'Danilo D.G. Arcega, Jr.'],
    ['Santiago', 'Fortunato R. Cajanding'],
    ['Santisima Trinidad', 'Rommel D.C. Alenia'],
    ['Santo Cristo', 'Denver T. Del Rosario'],
    ['Santo Niño', 'Gabriel G. Bautista'],
    ['Santo Rosario', 'Ricardo P. Laquindanum'],
    ['Santor', 'Jose B. Robles'],
    ['Sumapang Bata', 'Prisco M. Hernandez'],
    ['Sumapang Matanda', 'Fortunato C. Ramos'],
    ['Taal', 'Alvin S. Paraiso'],
    ['Tikay', 'Celso M. Hernandez'],
  ];

  function createCard(barangay, captain) {
    const card = document.createElement('article');
    card.className = 'barangay-card';

    const header = document.createElement('div');
    header.className = 'barangay-card-header';

    const icon = document.createElement('i');
    icon.className = 'bi bi-geo-alt-fill';
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'barangay-name';
    name.textContent = barangay;

    const body = document.createElement('div');
    body.className = 'barangay-card-body';

    const role = document.createElement('span');
    role.className = 'barangay-role';
    role.dataset.i18n = 'gov-punong-barangay';
    role.textContent = 'Punong Barangay';

    const captainName = document.createElement('span');
    captainName.className = 'barangay-captain';
    captainName.textContent = captain;

    header.append(icon, name);
    body.append(role, captainName);
    card.append(header, body);
    return card;
  }

  function renderBarangays() {
    const grid = document.getElementById('barangay-grid');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    barangays.forEach(function (entry) {
      fragment.appendChild(createCard(entry[0], entry[1]));
    });

    grid.replaceChildren(fragment);
    grid.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBarangays);
  } else {
    renderBarangays();
  }
})();
