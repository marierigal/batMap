/**
 * Leaflet Map
 * API Documentation: http://leafletjs.com/reference.html
 * MarkerCluster Documentation: https://leaflet.github.io/Leaflet.markercluster/
 * Free providers: https://leaflet-extras.github.io/leaflet-providers/preview/
 */

import { AbstractMap } from '../../AbstractMap';
import { DefaultIconType, Provider } from '../../constants';
import {
  EventCallbacks,
  LabelsOptions,
  LatLng,
  LatLngBounds,
  LatLngBoundsLiteral,
  LatLngObject,
  Location,
  LocationPoint,
  Marker,
  Padding,
  Point,
  BatMapProvider,
  ProviderConstructorArgs,
} from '../../interfaces';
import { DomUtils, LoaderUtils } from '../../utils';

type provider = Provider.leaflet;

export class Leaflet
  extends AbstractMap<provider>
  implements BatMapProvider<provider> {
  constructor(...args: ProviderConstructorArgs<provider>) {
    super(...args, {
      mapOptions: {
        center: [0, 0],
        zoom: 12,
        tileLayerProvider: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        tileLayerOptions: {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        },
      },
    });
  }

  load(callback?: () => void): void {
    this.domElement.classList.add('batmap__map', 'batmap-leaflet');

    // @ts-ignore
    if (window.L) {
      callback && callback();
      return;
    }

    DomUtils.addResources(
      document.head,
      [
        DomUtils.createStyle('//unpkg.com/leaflet@1.7.1/dist/leaflet.css'),
        DomUtils.createScript('//unpkg.com/leaflet@1.7.1/dist/leaflet.js'),
      ],
      () => {
        const resources = [];

        if (this.config.showCluster) {
          resources.push(
            DomUtils.createStyle(
              '//unpkg.com/leaflet.markercluster@1.1.0/dist/MarkerCluster.css',
            ),
            DomUtils.createStyle(
              '//unpkg.com/leaflet.markercluster@1.1.0/dist/MarkerCluster.Default.css',
            ),
            DomUtils.createScript(
              '//unpkg.com/leaflet.markercluster@1.1.0/dist/leaflet.markercluster.js',
            ),
          );
        }

        DomUtils.addResources(
          document.head,
          resources,
          LoaderUtils.addLoader(this.domElement, callback),
        );
      },
    );
  }

  initMap(): void {
    this.map = L.map(this.domElement, this.config.mapOptions);

    L.tileLayer(
      this.config.mapOptions.tileLayerProvider,
      this.config.mapOptions.tileLayerOptions,
    ).addTo(this.map);
  }

  setPoint(location: Location, iconType: string, label?: string): void {
    const point: LocationPoint<provider> = {
      position: this.makeLatLng(
        location.localisation.coordinates.latitude,
        location.localisation.coordinates.longitude,
      ),
      id: `${location._id}`,
      location,
      iconType,
    };

    if (this.config.showLabel && label) {
      point.label = `${label}`;
    }

    this.points.push(point);
  }

  addMarkers(eventCallback: EventCallbacks<provider> = {}): void {
    this.points.forEach(point => {
      this.addMarker(point, eventCallback);
    });

    if (
      this.config.showCluster &&
      this.getMarkerIconByType(DefaultIconType.cluster) &&
      this.points.length
    ) {
      this.addCluster();
    }
  }

  addMarker(
    point: LocationPoint<provider>,
    eventCallbacks: EventCallbacks<provider> = {},
  ): void {
    const marker = {
      ...L.marker(point.position, point as any),
      id: point.id,
      location: point.location,
      iconType: point.iconType,
      options: {
        alt: 'marker ' + point.location?.name,
      },
    } as Marker<provider>;

    if (
      this.config.showCluster &&
      this.getMarkerIconByType(DefaultIconType.cluster)
    ) {
      this.cluster?.addLayer(marker);
    } else {
      this.map && marker.addTo(this.map);
    }

    Object.keys(eventCallbacks).forEach(event => {
      const callback = eventCallbacks[event];
      marker.on(event, () => callback(marker));
    });

    this.extendBounds(marker.getLatLng());

    this.markers.push(marker);

    this.setIconOnMarker(marker, point.iconType);
  }

  removeMarker(markerId: Marker<provider> | string): void {
    const marker = this.getMarker(markerId);

    if (marker) {
      this.map && marker.removeFrom(this.map);
      this.markers = this.markers.filter(m => m.id !== marker.id);
    }
  }

  removeCluster(): void {
    this.cluster?.remove();
  }

  setMarkerIcons(): void {
    Object.keys(this.config.markersOptions).forEach(type => {
      const options = this.config.markersOptions[type];
      const iconAnchor = options.anchor || [options.width / 2, options.height];
      const iconLabelOptions = options.label || {};

      const icon = new L.Icon({
        className: `batmap-marker-${type}`,
        iconUrl: options.url,
        iconSize: [options.width, options.height],
        iconAnchor,
        labelOptions: this.getLabelOptions(iconLabelOptions),
      }) as any;

      icon.type = type;

      this.icons.push(icon);
    });
  }

  setIconOnMarker(
    markerId: Marker<provider> | string,
    iconType: string,
    hasLabel = true,
  ): void {
    const marker = this.getMarker(markerId);
    const icon = this.getMarkerIconByType(iconType);

    if (marker && icon) {
      marker.iconType = iconType;

      if (this.config.showLabel && hasLabel) {
        const span = this.getIconLabelHtml(
          marker.options.alt || '',
          icon.options.labelOptions,
        );

        marker.setIcon(
          new L.DivIcon({
            className: icon.options.className,
            iconSize: icon.options.iconSize,
            iconAnchor: icon.options.iconAnchor,
            html: `<img src="${icon.options.iconUrl}" class="map-marker-${iconType}__image" alt="${marker.options.alt}">${span.outerHTML}`,
          }),
        );
      } else {
        marker.setIcon(icon);
      }
    }
  }

  focusOnMarker(
    markerId: Marker<provider> | string,
    offset?: Point<provider>,
  ): void {
    this.focusInProgress = true;
    let hasOffset = !!offset?.x || !!offset?.y;
    const point = new L.Point(offset?.x || 0, offset?.y || 0);

    const onMoveEnd = (): void => {
      if (hasOffset) {
        hasOffset = false;
        this.map?.panBy(point);
      } else {
        this.focusInProgress = false;
        this.map?.off('moveend', onMoveEnd, this);
      }
    };

    this.map?.on(
      'moveend',
      () => {
        if (hasOffset) {
          hasOffset = false;
          this.map?.panBy(point);
        } else {
          this.focusInProgress = false;
          this.map?.off('moveend', onMoveEnd, this);
        }
      },
      this,
    );

    const marker = this.getMarker(markerId);
    marker && this.panTo(marker.getLatLng(), this.config.locationZoom);
  }

  addUserMarker(
    position: LatLng<provider>,
    iconType: string,
    id = 'user',
  ): void {
    if (this.userMarker && this.map) {
      this.userMarker = L.marker(position, {
        id: `${id}`,
        iconType,
      } as L.MarkerOptions) as Marker<provider>;

      this.userMarker.addTo(this.map);
      this.setIconOnMarker(this.userMarker, iconType, false);
      this.extendBounds(position);
    }
  }

  addCluster(): void {
    const icon = this.getMarkerIconByType(DefaultIconType.cluster);

    if (icon) {
      const options: L.MarkerClusterGroupOptions = {
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster: L.MarkerCluster): L.DivIcon => {
          const span = this.getIconLabelHtml(
            `${cluster.getChildCount()}`,
            icon.options.labelOptions,
          );

          return L.divIcon({
            className: icon.options.className,
            html: `<img src="${icon.options.iconUrl}" class="map-marker-cluster__image" alt="Cluster">${span.outerHTML}`,
            iconSize: icon.options.iconSize,
          });
        },
      };

      this.cluster = L.markerClusterGroup(options);
      this.map?.addLayer(this.cluster);
    }
  }

  getZoom(): number | undefined {
    return this.map?.getZoom();
  }

  setZoom(zoom: number): void {
    this.map?.setZoom(zoom);
  }

  makeLatLng(latitude: number, longitude: number): LatLng<provider> {
    return L.latLng(latitude, longitude);
  }

  setCenter(position: LatLng<provider>, zoom = this.config.zoom): void {
    this.map?.setView(position, zoom);
  }

  getCenterLatLng(): LatLngObject {
    const center = this.map?.getCenter();

    return {
      lat: center?.lat || 0,
      lng: center?.lng || 0,
    };
  }

  getBounds(): LatLngBounds<provider> | undefined {
    return this.map?.getBounds();
  }

  getBoundsLiteral(): LatLngBoundsLiteral {
    const bounds = this.map?.getBounds();

    if (!bounds) {
      return [0, 0, 0, 0];
    }

    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    return [southWest.lat, southWest.lng, northEast.lat, northEast.lng];
  }

  extendBounds(position: LatLng<provider>): LatLngBounds<provider> | undefined {
    return this.map?.getBounds()?.extend(position);
  }

  fitBounds(
    bounds: LatLngBounds<provider>,
    {
      padding = 50,
      zoom = this.config.zoom,
    }: { padding?: Padding; zoom?: number },
  ): void {
    const options: {
      maxZoom?: number;
      padding?: Point<provider>;
      paddingTopLeft?: Point<provider>;
      paddingBottomRight?: Point<provider>;
    } = { maxZoom: zoom };

    if (typeof padding === 'number') {
      options.padding = L.point(padding, padding);
    } else {
      options.paddingTopLeft = L.point(padding.left || 0, padding.top || 0);
      options.paddingBottomRight = L.point(
        padding.right || 0,
        padding.bottom || 0,
      );
    }

    this.map?.fitBounds(bounds, options);
  }

  panTo(position: LatLng<provider>, zoom: number = this.config.zoom): void {
    this.map?.setView(position, zoom);
  }

  panBy(x: number, y: number): void {
    this.map?.panBy(L.point(x, y));
  }

  listenZoomChange(callback: (zoom: number) => void): void {
    this.map?.on('zoomend', () => {
      return this.map && callback(this.map.getZoom());
    });
  }

  listenBoundsChange(
    callback: (bounds: LatLngObject) => void,
    ignoreFocusOnMarker = true,
  ): void {
    this.map?.on('move', () => {
      if (ignoreFocusOnMarker && this.focusInProgress) {
        return;
      }

      return callback(this.getCenterLatLng());
    });
  }

  minifyMarkerIcons(breakZoom = 8, minifier = 0.8): void {
    const zoom = this.getZoom();

    if (zoom && zoom < breakZoom + 1 && !this.isMinifiedMarkerIcons) {
      this.icons.forEach(icon => {
        const size = icon.options.iconSize;
        const iconWidth = Array.isArray(size) ? size[0] : size?.x || 0;
        const iconHeight = Array.isArray(size) ? size[0] : size?.y || 0;

        const width = iconWidth * minifier;
        const height = iconHeight * minifier;

        icon.options.iconSize = [width, height];
        icon.options.iconAnchor = [width / 2, height];
      });

      this.refreshAllMarkers();

      this.isMinifiedMarkerIcons = true;
    } else if (zoom && zoom > breakZoom && this.isMinifiedMarkerIcons) {
      this.icons.forEach(icon => {
        const size = icon.options.iconSize;
        const iconWidth = Array.isArray(size) ? size[0] : size?.x || 0;
        const iconHeight = Array.isArray(size) ? size[0] : size?.y || 0;

        const width = iconWidth / minifier;
        const height = iconHeight / minifier;

        icon.options.iconSize = [width, height];
        icon.options.iconAnchor = [width / 2, height];
      });

      this.refreshAllMarkers();

      this.isMinifiedMarkerIcons = false;
    }
  }

  refreshAllMarkers(): void {
    this.getMarkers().forEach(marker => {
      const iconName = this.getMarkerIconType(marker);
      const icon = iconName && this.getMarkerIconByType(iconName);

      icon && marker.setIcon(icon);
    });

    if (this.userMarker) {
      const icon = this.getMarkerIconByType(DefaultIconType.user);
      icon && this.userMarker.setIcon(icon);
    }
  }

  private getLabelOptions(options: LabelsOptions): LabelsOptions {
    return {
      origin: options.origin || this.config.labelsOptions.origin,
      color: options.color || this.config.labelsOptions.color,
      font: options.font || this.config.labelsOptions.font,
      size: options.size || this.config.labelsOptions.size,
      weight: options.weight || this.config.labelsOptions.weight,
    };
  }

  private getIconLabelHtml(text: string, options: LabelsOptions): HTMLElement {
    const span = document.createElement('span');
    const [originTop, originLeft] = options.origin || [0, 0];

    span.innerText = text;
    span.style.position = 'absolute';
    span.style.top = `${originTop}px`;
    span.style.left = `${originLeft}px`;
    span.style.transform = 'translate(-50%, -50%)';
    span.style.color = `${options.color}`;
    span.style.fontFamily = `${options.font}`;
    span.style.fontWeight = `${options.weight}`;
    span.style.fontSize = `${options.size}px`;

    return span;
  }
}

export default Leaflet;
