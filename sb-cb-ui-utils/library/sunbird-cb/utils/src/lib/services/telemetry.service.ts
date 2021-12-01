import { Inject, Injectable } from '@angular/core'
import { filter } from 'rxjs/operators'
// import { AuthKeycloakService } from './auth-keycloak.service'
import { NsInstanceConfig } from './configurations.model'
import { ConfigurationsService } from './configurations.service'
import { WsEvents } from './event.model'
import { EventService } from './event.service'
import { LoggerService } from './logger.service'
import { NsContent } from './widget-content.model'

declare var $t: any

@Injectable({
  providedIn: 'root',
})
export class TelemetryService {
  previousUrl: string | null = null
  telemetryConfig: NsInstanceConfig.ITelemetryConfig | null = null
  pData: any = null
  contextCdata = []

  externalApps: any = {
    RBCP: 'rbcp-web-ui',
  }
  environment: any
  constructor(
    @Inject('environment') environment: any,
    private configSvc: ConfigurationsService,
    private eventsSvc: EventService,
    // private authSvc: AuthKeycloakService,
    private logger: LoggerService,

  ) {
    const instanceConfig = this.configSvc.instanceConfig
    if (instanceConfig) {
      this.telemetryConfig = instanceConfig.telemetryConfig
      this.environment = environment
      this.telemetryConfig = {
        ...this.telemetryConfig,
        pdata: {
          ...this.telemetryConfig.pdata,
          // pid: navigator.userAgent,
          id: `${environment.name}.${this.telemetryConfig.pdata.id}`,
        },
        uid: this.configSvc.userProfile && this.configSvc.userProfile.userId,
        // authtoken: this.authSvc.token,
        // tslint:disable-next-line: no-non-null-assertion
        channel: this.rootOrgId || this.telemetryConfig.channel,
        sid: this.getTelemetrySessionId,
      }
      this.pData = this.telemetryConfig.pdata
      this.addPlayerListener()
      this.addInteractListener()
      this.addFeedbackListener()
      this.addTimeSpentListener()
      this.addSearchListener()
      this.addHearbeatListener()
    }
  }

  get getTelemetrySessionId(): string {
    return localStorage.getItem('telemetrySessionId') || ''
  }

  get rootOrgId(): string {
    if (this.configSvc && this.configSvc.userProfile && this.configSvc.userProfile.rootOrgId) {
      return this.configSvc.userProfile.rootOrgId
    }
    return ''
  }

  start(type: string, mode: string, id: string, data?: any) {
    try {
      if (this.telemetryConfig) {
        $t.start(
          this.telemetryConfig,
          id,
          '1.0',
          {
            // id,
            type,
            mode,
            pageid: id,
          },
          {
            context: {
              pdata: {
                ...this.pData,
                id: this.pData.id,
              },
            },
            object: {
              ...(data) && data,
            },
          }
        )
      } else {
        this.logger.error('Error Initializing Telemetry. Config missing.')
      }
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log('Error in telemetry start', e)
    }
  }

  end(type: string, mode: string, id: string, data?: any) {
    try {
      $t.end(
        {
          type,
          mode,
          pageid: id,
        },
        {
          context: {
            pdata: {
              ...this.pData,
              id: this.pData.id,
            },
          },
          object: {
            ...(data) && data,
          },
        },
      )
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log('Error in telemetry end', e)
    }
  }

  audit(type: string, props: string, data: any) {
    try {
      $t.audit(
        {
          type,
          props,
          // data,
          state: data, // Optional. Current State
          prevstate: '', // Optional. Previous State
          duration: '', // Optional.
        },
        {
          context: {
            pdata: {
              ...this.pData,
              id: this.pData.id,
            },
          },
        },
      )
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log('Error in telemetry audit', e)
    }
  }

  heartbeat(type: string, id: string) {
    try {
      $t.heartbeat({
        id,
        // mode,
        type,
      })
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log('Error in telemetry heartbeat', e)
    }
  }

  impression(data?: any) {
    try {
      const page = this.getPageDetails()
      if (data) {
        page.pageid = data.pageId
        page.module = data.pageModule
      }
      const edata = {
        pageid: page.pageid, // Required. Unique page id
        type: page.pageUrlParts[0], // Required. Impression type (list, detail, view, edit, workflow, search)
        uri: page.pageUrl,
      }
      if (page.objectId) {
        const config = {
          context: {
            pdata: {
              ...this.pData,
              id: this.pData.id,
            },
            env: page.module || (this.telemetryConfig && this.telemetryConfig.env),
          },
          object: {
            id: page.objectId,
          },
        }
        $t.impression(edata, config)
      } else {
        $t.impression(edata, {
          context: {
            pdata: {
              ...this.pData,
              id: this.pData.id,
            },
            env: page.module,
          },
        })
      }
      this.previousUrl = page.pageUrl
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log('Error in telemetry impression', e)
    }
  }

  externalImpression(impressionData: any) {
    try {
      const page = this.getPageDetails()
      if (this.externalApps[impressionData.subApplicationName]) {
        const externalConfig = page.objectId ? {
          context: {
            pdata: {
              ...this.pData,
              id: this.externalApps[impressionData.subApplicationName],
            },
          },
          object: {
            id: page.objectId,
          },
        } : {
          context: {
            pdata: {
              ...this.pData,
              id: this.externalApps[impressionData.subApplicationName],
            },
          },
        }
        $t.impression(impressionData.data, externalConfig)
      }
    } catch (e) {
      // tslint:disable-next-line: no-console
      console.log('Error in telemetry externalImpression', e)
    }
  }

  addTimeSpentListener() {
    this.eventsSvc.events$
      .pipe(
        filter(
          event =>
            event &&
            event.eventType === WsEvents.WsEventType.Telemetry &&
            event.data.type === WsEvents.WsTimeSpentType.Page &&
            event.data.mode &&
            event.data,
        ),
      )
      .subscribe(event => {
        if (event.data.state === WsEvents.EnumTelemetrySubType.Loaded) {
          this.start(
            event.data.type || WsEvents.WsTimeSpentType.Page,
            event.data.mode || WsEvents.WsTimeSpentMode.View,
            event.data.pageId,
          )
        }
        if (event.data.state === WsEvents.EnumTelemetrySubType.Unloaded) {
          this.end(
            event.data.type || WsEvents.WsTimeSpentType.Page,
            event.data.mode || WsEvents.WsTimeSpentMode.View,
            event.data.pageId,
          )
        }
      })
  }
  addPlayerListener() {
    this.eventsSvc.events$
      .pipe(
        filter(
          event =>
            event &&
            event.eventType === WsEvents.WsEventType.Telemetry &&
            event.data.type === WsEvents.WsTimeSpentType.Player &&
            event.data.mode &&
            event.data,
        ),
      )
      .subscribe(event => {
        const content: NsContent.IContent | null = event.data.content
        if (
          event.data.state === WsEvents.EnumTelemetrySubType.Loaded &&
          (!content ||
            (content.isIframeSupported || '').toLowerCase() === 'maybe' ||
            (content.isIframeSupported || '').toLowerCase() === 'yes')
        ) {
          this.start(
            event.data.type || WsEvents.WsTimeSpentType.Player,
            event.data.mode || WsEvents.WsTimeSpentMode.Play,
            event.data.identifier,
            event.data.object
          )
        }
        if (
          event.data.state === WsEvents.EnumTelemetrySubType.Unloaded &&
          (!content ||
            (content.isIframeSupported || '').toLowerCase() === 'maybe' ||
            (content.isIframeSupported || '').toLowerCase() === 'yes')
        ) {
          this.end(
            event.data.type || WsEvents.WsTimeSpentType.Player,
            event.data.mode || WsEvents.WsTimeSpentMode.Play,
            event.data.identifier,
            event.data.object
          )
        }
      })
  }

  addInteractListener() {
    this.eventsSvc.events$
      .pipe(
        filter(
          (event: WsEvents.WsEventTelemetryInteract) =>
            event &&
            event.data &&
            event.eventType === WsEvents.WsEventType.Telemetry &&
            event.data.eventSubType === WsEvents.EnumTelemetrySubType.Interact,
        ),
      )
      .subscribe(event => {
        const page = this.getPageDetails()
        if (typeof event.from === 'string' && this.externalApps[event.from]) {
          const externalConfig = {
            context: {
              pdata: {
                ...this.pData,
                id: this.externalApps[event.from],
              },
            },
          }
          try {
            $t.interact(event.data, externalConfig)
          } catch (e) {
            // tslint:disable-next-line: no-console
            console.log('Error in telemetry interact', e)
          }
        } else {
          let interactid
          if (event.data.type === 'goal') {
            interactid = page.pageUrlParts[4]
          }
          try {
            $t.interact(
              {
                type: event.data.type,
                subtype: event.data.subType,
                // object: event.data.object,
                id: (event.data.object) ? event.data.object.contentId || event.data.object.id || interactid || '' : '',
                pageid: page.pageid,
                // target: { page },
              },
              {
                context: {
                  pdata: {
                    ...this.pData,
                    id: this.pData.id,
                  },
                },
                object: {
                  ...event.data.object,
                },
              })
          } catch (e) {
            // tslint:disable-next-line: no-console
            console.log('Error in telemetry interact', e)
          }
        }
      })
  }

  addFeedbackListener() {
    this.eventsSvc.events$
      .pipe(
        filter(
          (event: WsEvents.WsEventTelemetryFeedback) =>
            event &&
            event.data &&
            event.eventType === WsEvents.WsEventType.Telemetry &&
            event.data.eventSubType === WsEvents.EnumTelemetrySubType.Feedback,
        ),
      )
      .subscribe(event => {
        const page = this.getPageDetails()
        try {
          $t.feedback(
            {
              rating: event.data.object.rating || 0,
              commentid: event.data.object.commentid || '',
              commenttxt: event.data.object.commenttxt || '',
              pageid: page.pageid,
            },
            {
              context: {
                pdata: {
                  ...this.pData,
                  id: this.pData.id,
                },
              },
              object: {
                id: event.data.object.contentId || event.data.object.id || '',
                type: event.data.type || '',
                ver: `${(event.data.object.version || '1')}${''}`,
                rollup: {},
              },
            })
        } catch (e) {
          // tslint:disable-next-line: no-console
          console.log('Error in telemetry interact', e)
        }
      })
  }

  addHearbeatListener() {
    this.eventsSvc.events$
      .pipe(
        filter(
          (event: WsEvents.WsEventTelemetryHeartBeat) =>
            event &&
            event.data &&
            event.eventType === WsEvents.WsEventType.Telemetry &&
            event.data.eventSubType === WsEvents.EnumTelemetrySubType.HeartBeat,
        ),
      )
      .subscribe(event => {
        if (typeof event.from === 'string' && this.externalApps[event.from]) {
          const externalConfig = {
            context: {
              pdata: {
                ...this.pData,
                id: this.externalApps[event.from],
              },
            },
          }
          try {
            $t.heartbeat(event.data, externalConfig)
          } catch (e) {
            // tslint:disable-next-line: no-console
            console.log('Error in telemetry heartbeat', e)
          }
        } else {
          try {
            $t.heartbeat(
              {
                type: event.data.type,
                // subtype: event.data.eventSubType,
                id: event.data.id,
                // mimeType: event.data.mimeType,
                // mode: event.data.mode,
              },
              {
                context: {
                  pdata: {
                    ...this.pData,
                    id: this.pData.id,
                  },
                },
              })
          } catch (e) {
            // tslint:disable-next-line: no-console
            console.log('Error in telemetry heartbeat', e)
          }
        }
      })
  }

  addSearchListener() {
    this.eventsSvc.events$
      .pipe(
        filter(
          (event: WsEvents.WsEventTelemetrySearch) =>
            event &&
            event.data &&
            event.eventType === WsEvents.WsEventType.Telemetry &&
            event.data.eventSubType === WsEvents.EnumTelemetrySubType.Search,
        ),
      )
      .subscribe(event => {
        try {
          $t.search(
            {
              query: event.data.query,
              filters: event.data.filters,
              size: event.data.size,
            },
            {
              context: {
                pdata: {
                  ...this.pData,
                  id: this.pData.id,
                },
              },
            },
          )
        } catch (e) {
          // tslint:disable-next-line: no-console
          console.log('Error in telemetry search', e)
        }
      })
  }

  getPageDetails() {
    const path = window.location.pathname.replace('/', '')
    const url = path + window.location.search
    return {
      pageid: path,
      pageUrl: url,
      pageUrlParts: path.split('/'),
      refferUrl: this.previousUrl,
      objectId: this.extractContentIdFromUrlParts(path.split('/')),
      module: '',
    }
  }

  extractContentIdFromUrlParts(urlParts: string[]) {
    // TODO: pick toc and viewer url from some configuration
    const tocIdx = urlParts.indexOf('toc')
    const viewerIdx = urlParts.indexOf('viewer')

    if (tocIdx === -1 && viewerIdx === -1) {
      return null
    }

    if (tocIdx !== -1 && tocIdx < urlParts.length - 1) {
      return urlParts[tocIdx + 1] // e.g. url /app/toc/<content_id>
    }

    if (viewerIdx !== -1 && viewerIdx < urlParts.length - 2) {
      return urlParts[viewerIdx + 2] // e.g. url /app/viewer/<content_type>/<content_id>
    }

    return null
  }
}
