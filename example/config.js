// Parameters

export const mapConfig = {
  /* Gmaps */
  provider: 'gmaps',
  apiKey: 'AIzaSyBgMN26G65UEgkWVDIPKTq-VpvktLmezjQ',
  // apiKey: ['gme-lorealsa', 'Cz_fa_vO6pGrXm7LV9yNKZCJrpA='],

  /* Mappy */
  // provider: 'mappy',
  // apiKey: 'PJ_Bridge',

  /* Leaflet */
  // provider: 'leaflet',
  // apiKey: '',

  locale: 'en',
  showCluster: true,
  showLabel: true,
  showPosition: true,
  options: {
    zoom: 12,
    locationZoom: 16,
  },
  markers: {
    default: {
      url: './assets/markers/marker-default.svg',
      width: 38,
      height: 50,
    },
    hover: {
      url: './assets/markers/marker-hover.svg',
      width: 38,
      height: 50,
    },
    active: {
      url: './assets/markers/marker-active.svg',
      width: 38,
      height: 50,
    },
    location: {
      url: './assets/markers/marker-location.svg',
      width: 38,
      height: 50,
    },
    user: {
      url: './assets/markers/marker-user.svg',
      width: 38,
      height: 50,
    },
    cluster: {
      url: './assets/markers/marker-cluster.svg',
      width: 50,
      height: 50,
      label: {
        origin: [25, 25],
        size: 14,
      },
    },
  },
  labels: {
    origin: [19, 19],
    color: 'white',
    font: 'Arial, sans-serif',
    size: '14px',
    weight: 'normal',
  },
  clusters: {},
};
