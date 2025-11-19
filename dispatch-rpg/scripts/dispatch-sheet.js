\
/* Dispatch final v3 script */
/* Inject CSS */
(function ensureThemeCSS(){
  const cssPath = "systems/dispatch-rpg/styles/dispatch-theme.css";
  if (document.getElementById("dispatch-rpg-theme-style")) return;
  fetch(cssPath).then(r=>r.ok && r.text()).then(css=>{
    if(!css) return;
    const el=document.createElement('style'); el.id='dispatch-rpg-theme-style'; el.innerHTML=css; document.head.appendChild(el);
  }).catch(()=>{});
})();

class DispatchActorSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dispatch","sheet","actor"],
      template: "systems/dispatch-rpg/templates/sheets/dispatch-actor-sheet.html",
      width: 1100,
      height: 820,
      resizable: true
    });
  }

  getData(options) {
    const data = super.getData(options);
    // map older data to system.* if necessary for compatibility
    data.system = this.actor.system || this.actor.data?.system || getProperty(this.actor.data,"system") || {};
    // ensure paths exist
    data.system.attributes = data.system.attributes || {};
    data.system.skills = data.system.skills || {};
    data.system.resources = data.system.resources || {};
    data.system.stats = data.system.stats || {};
    data.system.history = data.system.history || { summary: "", psychProfile: "" };
    data.system.aspirações = data.system.aspirações || "";
    data.rows = [
      { key: 'atletismo', label: 'ATLETISMO', attrKey: 'for', attrLabel: 'Força', value: getProperty(data.system, 'skills.atletismo.value') || 0 },
      { key: 'intimidacao', label: 'INTIMIDAÇÃO', attrKey: 'car', attrLabel: 'Carisma', value: getProperty(data.system, 'skills.intimidacao.value') || 0 },
      { key: 'percepcao', label: 'PERCEPÇÃO', attrKey: 'int', attrLabel: 'Intelecto', value: getProperty(data.system, 'skills.percepcao.value') || 0 },
      { key: 'furtividade', label: 'FURTIVIDADE', attrKey: 'agi', attrLabel: 'Agi', value: getProperty(data.system, 'skills.furtividade.value') || 0 },
      { key: 'tolerancia', label: 'TOLERÂNCIA', attrKey: 'vig', attrLabel: 'Vigor', value: getProperty(data.system, 'skills.tolerancia.value') || 0 },
      { key: 'desarmado', label: 'DESARMADO', attrKey: 'for', attrLabel: 'Força', value: getProperty(data.system, 'skills.desarmado.value') || 0 },
      { key: 'conducao', label: 'CONDUÇÃO', attrKey: 'agi', attrLabel: 'Agi', value: getProperty(data.system, 'skills.conducao.value') || 0 },
      { key: 'dissimulacao', label: 'DISSIMULAÇÃO', attrKey: 'car', attrLabel: 'Carisma', value: getProperty(data.system, 'skills.dissimulacao.value') || 0 },
      { key: 'evacao', label: 'EVASÃO', attrKey: 'agi', attrLabel: 'Agi', value: getProperty(data.system, 'skills.evacao.value') || 0 },
      { key: 'vontade', label: 'VONTADE', attrKey: 'pod', attrLabel: 'POD', value: getProperty(data.system, 'skills.vontade.value') || 0 },
      { key: 'influencia', label: 'INFLUÊNCIA', attrKey: 'car', attrLabel: 'Carisma', value: getProperty(data.system, 'skills.influencia.value') || 0 },
      { key: 'intuicao', label: 'INTUIÇÃO', attrKey: 'int', attrLabel: 'Intelecto', value: getProperty(data.system, 'skills.intuicao.value') || 0 },
      { key: 'linguagem', label: 'LINGUAGEM', attrKey: 'int', attrLabel: 'Intelecto', value: getProperty(data.system, 'skills.linguagem.value') || 0 },
      { key: 'malandragem', label: 'MALANDRAGEM', attrKey: 'car', attrLabel: 'Carisma', value: getProperty(data.system, 'skills.malandragem.value') || 0 },
      { key: 'musculatura', label: 'MUSCULATURA', attrKey: 'vig', attrLabel: 'Vigor', value: getProperty(data.system, 'skills.musculatura.value') || 0 },
      { key: 'ocultacao', label: 'OCULTAÇÃO', attrKey: 'agi', attrLabel: 'Agi', value: getProperty(data.system, 'skills.ocultacao.value') || 0 },
      { key: 'investigacao', label: 'INVESTIGAÇÃO', attrKey: 'int', attrLabel: 'Intelecto', value: getProperty(data.system, 'skills.investigacao.value') || 0 },
      { key: 'primeirosSocorros', label: 'PRIMEIROS SOCORROS', attrKey: 'int', attrLabel: 'Intelecto', value: getProperty(data.system, 'skills.primeirosSocorros.value') || 0 }
    ];
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Tabs behaviour: hide right column on historico
    html.find('.sidebar-btn[data-tab]').on('click', ev => {
      const tab = ev.currentTarget.dataset.tab;
      html.find('.tab-section').addClass('hidden');
      html.find(`.tab-section[data-tab="${tab}"]`).removeClass('hidden');
      if (tab === "historico") html.find('.right-column').hide();
      else html.find('.right-column').show();
    });

    // Portrait uploader
    const uploader = html.find('.portrait-uploader');
    const portraitImg = html.find('.portrait-img');
    portraitImg.on('click', ()=> uploader.trigger('click'));
    uploader.on('change', async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      try {
        const uploaded = await foundry.applications.apps.FilePicker.implementation.upload("data", "systems/dispatch-rpg/", file, {});
        const path = uploaded?.path || (uploaded[0] && uploaded[0].path) || uploaded[0]?.url;
        await this.actor.update({ img: path });
      } catch (err) {
        console.error('Upload failed', err);
        ui.notifications.error('Falha ao enviar a imagem. Veja o console.');
      }
    });

    // Skill roll handler (1d20 + attribute + skill). Detect nat1/nat20.
    html.find('.skill-roll-btn').on('click', async (ev) => {
      ev.preventDefault();
      const btn = ev.currentTarget;
      const attr = btn.dataset.attr;
      const key = btn.dataset.skillkey;
      // read skill value from input (system path)
      const skillInput = html.find(`input[name="system.skills.${key}.value"]`)[0];
      const skillVal = Number(skillInput?.value) || 0;
      // persist skill modifier
      await this.actor.update({[`system.skills.${key}.value`]: skillVal});
      // read attribute value
      const attrVal = Number(getProperty(this.actor, `system.attributes.${attr}.value`) || getProperty(this.actor.data, `system.attributes.${attr}.value`) || 0);
      const formula = `1d20`;
      const roll = await new Roll(formula).roll({async:true});
      const total = roll.total + attrVal + skillVal;
      // detect natural 1/20
      const terms = roll.terms || [];
      let diceTerm = null;
      for (const t of terms) {
        if (t.constructor && t.constructor.name === "Die") { diceTerm = t; break; }
      }
      const nat = (diceTerm && diceTerm.results && diceTerm.results[0]) ? diceTerm.results[0].result : null;
      // build message with colors for nat1/nat20
      let flavor = `${this.actor.name} — ${key.toUpperCase()} (1d20 + ${attrVal} + ${skillVal})`;
      let content = `<div class="dice-roll"><div><strong>${flavor}</strong></div><div>Valor do dado: <strong>${nat ?? roll.total}</strong></div><div>Total: <strong>${total}</strong></div></div>`;
      const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: content
      };
      // Post with special styling for nat1/nat20
      const msg = await ChatMessage.create(chatData);
      // add CSS class to message based on nat
      if (nat === 20) {
        // success critical - make green
        const el = document.getElementById(msg.data._id) || document.querySelector(`.message[data-message-id="${msg.id}"]`);
        // style via chat message content (fallback): append colored badge
        await msg.update({ content: content + `<div style="color:limegreen;font-weight:700">Crítico!</div>` });
      } else if (nat === 1) {
        await msg.update({ content: content + `<div style="color:#ff4d4d;font-weight:700">Falha Crítica!</div>` });
      } else {
        // no extra decoration
      }
    });

    // Save on change for all inputs and textareas (system.* paths)
    html.find('input, textarea').on('change', async ev => {
      const el = ev.currentTarget;
      const name = el.name;
      if (!name) return;
      let val = el.value;
      if (el.type === 'number') val = Number(val) || 0;
      // Build update object in dot notation
      const update = foundry.utils.expandObject({ [name]: val });
      try {
        await this.actor.update(update);
      } catch (e) {
        console.error("Save failed", e);
      }
    });
  }
}

Hooks.once('init', () => {
  Actors.registerSheet('dispatch-rpg', DispatchActorSheet, { types: ['character'], makeDefault: true });
  CONFIG.Actor.sheetClasses['dispatch-rpg'] = CONFIG.Actor.sheetClasses['dispatch-rpg'] || {};
  console.log('Dispatch final v3 initialized');
});
