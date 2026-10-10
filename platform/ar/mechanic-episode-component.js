import {createSequencePresenter} from '../ui/sequence-presenter'
import {createInteractionAdapter} from './interaction-adapter'
import {createDiscoveryAdapter} from './discovery-adapter'
import {createScenarioRunner} from '../core/scenario-runner'
import {createMarkerManager} from './marker-manager'
import {createArObjectManager} from './ar-object-manager'
import {createMechanicPresenter} from '../ui/mechanic-presenter'

const validPose = pose => pose && pose.position && pose.rotation && pose.scale > 0 &&
  [pose.position.x, pose.position.y, pose.position.z, pose.rotation.x, pose.rotation.y,
    pose.rotation.z, pose.rotation.w, pose.scale].every(Number.isFinite)

export function createMechanicEpisodeComponent({gameId, scenario, content, registry, createUI, createPresentation = null, createVisual = null, autoStart = true, debug = false, sink = () => {}}) {
  return {
    init() {
      const cleanups = []
      const cleanup = () => {
        while (cleanups.length) {
          try { cleanups.pop()() } catch (error) { console.error('Mechanic cleanup failed', error) }
        }
      }
      this.dispose = cleanup
      try {
        // Validate presentation/anchor references before allocating resources.
        for (const step of scenario.steps) {
          for (const command of [...(step.enter || []), ...(step.exit || [])]) {
            if (command.target && !content.objects[command.target]) throw new Error('Unknown scene object')
          }
          const views = content.steps[step.step_id]
          if (!views || !views.start || !views.success || !views.fail) throw new Error('Missing step presentation')
          if (step.mechanic_id === 'AR-07' && (!views.input || !views.wrongSequence || !views.replayLabel)) throw new Error('Missing SEQUENCE presentation')
          for (const id of step.content?.object_ids || []) {
            if (!content.objects[id] || content.objects[id].marker_id !== step.content.marker_id) throw new Error('Invalid object anchor')
          }
        }
        for (const definition of Object.values(content.objects)) {
          if (!Object.values(content.targets).includes(definition.marker_id)) throw new Error('Unknown object anchor')
          if (definition.offset && !['x', 'y', 'z'].every(axis => Number.isFinite(definition.offset[axis]))) throw new Error('Invalid object offset')
        }
        // Validate before creating UI, scene objects or attaching XR listeners.
        const runner = createScenarioRunner({gameId, scenario, registry, debug,
          capabilities: ['markerInput', 'targetVisibility', 'objectTouch', 'sequencePresentation'], markerIds: Object.values(content.targets),
          objectIds: Object.keys(content.objects), hintIds: Object.keys(content.hints)})
        this.runner = runner
        cleanups.push(() => runner.dispose())
        let presentation
        const ui = createUI(action => {
          if (action === 'START') { presentation?.unlock?.(); runner.start() }
          if (action === 'RETRY') runner.retryCurrent()
          if (action === 'NEXT') runner.next()
          if (action === 'RESTART') runner.restart()
          if (action === 'REPLAY') runner.input('presentation.sequence_replay', {}, 'ui')
        })
        cleanups.push(() => ui.dispose())
        const objects = createArObjectManager(this.el, content.objects, {createVisual})
        this.updateAnchors = deltaMs => objects.tick(deltaMs)
        cleanups.push(() => { this.updateAnchors = null })
        cleanups.push(() => objects.dispose())
        const interaction = createInteractionAdapter({THREE: AFRAME.THREE, scene: this.el,
          getSnapshot: () => runner.getSnapshot(),
          getTargets: snapshot => {
            const step = snapshot.step
            if (snapshot.scene_phase !== 'ACTIVE') return []
            const ids = step?.mechanic_id === 'AR-03' ? [step.content.target_id]
              : step?.mechanic_id === 'AR-05' ? step.content.target_ids.filter(id => !snapshot.mechanic.state.collected_ids.includes(id))
              : step?.mechanic_id === 'AR-06' || (step?.mechanic_id === 'AR-07' && snapshot.mechanic.state.phase === 'INPUT') ? step.content.target_ids : []
            return ids.map(id => ({id, object: objects.getObject3D(id)}))
          },
          onTouch: (payload, runId) => {
            if (runner.getSnapshot().run_id !== runId) return
            // Optional AR presentation guard, e.g. approaching a physical target.
            if (presentation?.canTouch?.(payload.target_id) === false) return
            runner.input('input.target_touched', payload, 'pointer')
          }})
        cleanups.push(() => interaction.dispose())
        cleanups.push(runner.on('mechanic.feedback', event => {
          if (event.run_id !== runner.getSnapshot().run_id) return
          if (event.payload.type === 'activated') objects.highlight(event.payload.target_id)
          if (event.payload.type === 'collected') { placed.delete(event.payload.target_id); objects.hide(event.payload.target_id) }
        }))
        const discovery = createDiscoveryAdapter({THREE: AFRAME.THREE, scene: this.el,
          getTarget: id => objects.getObject3D(id), getStep: () => runner.getSnapshot(),
          onFound: (id, observed, runId) => {
            if (runner.getSnapshot().run_id === runId) runner.input('ar.target_found', {target_id: id, observed_ms: observed}, 'visibility')
          }})
        this.observeDiscovery = now => discovery.tick(now)
        cleanups.push(() => { discovery.reset(); this.observeDiscovery = null })
        if (!createPresentation) {
          const presenter = createMechanicPresenter({runner, ui, content})
          cleanups.push(() => presenter.dispose())
        }
        cleanups.push(runner.on('*', sink, {critical: false}))
        const placed = new Set()
        const anchorPoses = new Map()
        const hideAll = () => { for (const id of placed) objects.hide(id); placed.clear() }
        const updateObjects = () => {
          for (const id of placed) {
            const pose = markers.tracked.get(content.objects[id].marker_id) || anchorPoses.get(content.objects[id].marker_id)
            if (validPose(pose)) { anchorPoses.set(content.objects[id].marker_id, pose); objects.show(id, pose) }
          }
        }
        const observe = (id, pose) => {
          if (validPose(pose)) anchorPoses.set(id, {position: {...pose.position}, rotation: {...pose.rotation}, scale: pose.scale})
          updateObjects()
          if (validPose(pose)) runner.input('ar.marker_detected', {marker_id: id}, 'ar')
        }
        const markers = createMarkerManager(this.el, content.targets, {
          found() {}, updated: observe, lost() {},
        })
        cleanups.push(() => markers.dispose())
        cleanups.push(runner.on('*', event => {
          if (event.type !== 'scenario.restarted' && event.run_id !== runner.getSnapshot().run_id) return
          if (event.type === 'mechanic.started') {
            const step = runner.getSnapshot().step
            if (['AR-05', 'AR-06', 'AR-07'].includes(step.mechanic_id)) {
              for (const target of step.content.target_ids) { objects.clearHighlight(target); placed.add(target) }
              updateObjects()
            }
            const id = step.content.marker_id
            if (validPose(markers.tracked.get(id))) runner.input('ar.marker_detected', {marker_id: id}, 'snapshot')
          } else if (event.type === 'mechanic.completed' && event.payload.outcome === 'SUCCESS') {
            const step = runner.getSnapshot().step
            for (const id of step.content?.object_ids || []) {
              if (content.objects[id].marker_id !== step.content.marker_id) throw new Error('Object anchor does not match SCAN marker')
              placed.add(id)
            }
            updateObjects()
          } else if (['scenario.restarted', 'scenario.completed', 'scenario.error'].includes(event.type)) { hideAll(); if (event.type !== 'scenario.completed') anchorPoses.clear() }
        }))
        if (createPresentation) {
          presentation = createPresentation({runner, ui, content, objects, scene: this.el,
            show(id) { placed.add(id); updateObjects() },
            hide(id) { placed.delete(id); objects.hide(id) },
          })
          this.storyTick = () => presentation.tick?.(runner.getTime())
          cleanups.push(() => { this.storyTick = null; presentation.dispose() })
        }
        const sequencePresenter = createSequencePresenter({runner,
          highlight: id => objects.highlight(id, '#ffffff'), clearHighlight: id => objects.clearHighlight(id),
          isReady: id => {
            const object = objects.getObject3D(id)
            let hasMesh = false
            object?.traverse(node => { if (node.isMesh) hasMesh = true })
            return !!object?.visible && hasMesh
          },
          onFrame: (id, index, total) => ui.tracking(index + ' / ' + total + ': ' + (content.objects[id].label || id)),
        })
        cleanups.push(() => sequencePresenter.dispose())
        const visibility = () => {
          if (document.hidden) { discovery.reset(); runner.pause(); markers.tracked.clear() }
          else runner.resume()
        }
        document.addEventListener('visibilitychange', visibility)
        cleanups.push(() => document.removeEventListener('visibilitychange', visibility))
        visibility()
        if (autoStart) runner.start()
        else ui.render(content.intro)
      } catch (error) {
        cleanup()
        console.error('Mechanic episode could not start', error)
        const ui = createUI(() => {})
        ui.render(content.error)
        cleanups.push(() => ui.dispose())
      }
    },
    tick(time, deltaMs) { this.updateAnchors?.(deltaMs); if (this.observeDiscovery) this.observeDiscovery(time); this.storyTick?.() },
    remove() { if (this.dispose) this.dispose() },
  }
}
