var O7=Object.defineProperty;var $7=Object.getOwnPropertyDescriptor;var l=(H,V,C,L)=>{for(var e=L>1?void 0:L?$7(V,C):V,r=H.length-1,t;r>=0;r--)(t=H[r])&&(e=(L?t(V,C,e):t(e))||e);return L&&e&&O7(V,C,e),e};var X1=globalThis,J1=X1.ShadowRoot&&(X1.ShadyCSS===void 0||X1.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,K2=Symbol(),R5=new WeakMap,$1=class{constructor(V,C,L){if(this._$cssResult$=!0,L!==K2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=V,this.t=C}get styleSheet(){let V=this.o,C=this.t;if(J1&&V===void 0){let L=C!==void 0&&C.length===1;L&&(V=R5.get(C)),V===void 0&&((this.o=V=new CSSStyleSheet).replaceSync(this.cssText),L&&R5.set(C,V))}return V}toString(){return this.cssText}},F5=H=>new $1(typeof H=="string"?H:H+"",void 0,K2),u=(H,...V)=>{let C=H.length===1?H[0]:V.reduce((L,e,r)=>L+(t=>{if(t._$cssResult$===!0)return t.cssText;if(typeof t=="number")return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(e)+H[r+1],H[0]);return new $1(C,H,K2)},D5=(H,V)=>{if(J1)H.adoptedStyleSheets=V.map(C=>C instanceof CSSStyleSheet?C:C.styleSheet);else for(let C of V){let L=document.createElement("style"),e=X1.litNonce;e!==void 0&&L.setAttribute("nonce",e),L.textContent=C.cssText,H.appendChild(L)}},G2=J1?H=>H:H=>H instanceof CSSStyleSheet?(V=>{let C="";for(let L of V.cssRules)C+=L.cssText;return F5(C)})(H):H;var{is:T7,defineProperty:P7,getOwnPropertyDescriptor:B7,getOwnPropertyNames:z7,getOwnPropertySymbols:R7,getPrototypeOf:F7}=Object,C2=globalThis,E5=C2.trustedTypes,D7=E5?E5.emptyScript:"",E7=C2.reactiveElementPolyfillSupport,T1=(H,V)=>H,P1={toAttribute(H,V){switch(V){case Boolean:H=H?D7:null;break;case Object:case Array:H=H==null?H:JSON.stringify(H)}return H},fromAttribute(H,V){let C=H;switch(V){case Boolean:C=H!==null;break;case Number:C=H===null?null:Number(H);break;case Object:case Array:try{C=JSON.parse(H)}catch{C=null}}return C}},H2=(H,V)=>!T7(H,V),j5={attribute:!0,type:String,converter:P1,reflect:!1,useDefault:!1,hasChanged:H2};Symbol.metadata??=Symbol("metadata"),C2.litPropertyMetadata??=new WeakMap;var G=class extends HTMLElement{static addInitializer(V){this._$Ei(),(this.l??=[]).push(V)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(V,C=j5){if(C.state&&(C.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(V)&&((C=Object.create(C)).wrapped=!0),this.elementProperties.set(V,C),!C.noAccessor){let L=Symbol(),e=this.getPropertyDescriptor(V,L,C);e!==void 0&&P7(this.prototype,V,e)}}static getPropertyDescriptor(V,C,L){let{get:e,set:r}=B7(this.prototype,V)??{get(){return this[C]},set(t){this[C]=t}};return{get:e,set(t){let a=e?.call(this);r?.call(this,t),this.requestUpdate(V,a,L)},configurable:!0,enumerable:!0}}static getPropertyOptions(V){return this.elementProperties.get(V)??j5}static _$Ei(){if(this.hasOwnProperty(T1("elementProperties")))return;let V=F7(this);V.finalize(),V.l!==void 0&&(this.l=[...V.l]),this.elementProperties=new Map(V.elementProperties)}static finalize(){if(this.hasOwnProperty(T1("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(T1("properties"))){let C=this.properties,L=[...z7(C),...R7(C)];for(let e of L)this.createProperty(e,C[e])}let V=this[Symbol.metadata];if(V!==null){let C=litPropertyMetadata.get(V);if(C!==void 0)for(let[L,e]of C)this.elementProperties.set(L,e)}this._$Eh=new Map;for(let[C,L]of this.elementProperties){let e=this._$Eu(C,L);e!==void 0&&this._$Eh.set(e,C)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(V){let C=[];if(Array.isArray(V)){let L=new Set(V.flat(1/0).reverse());for(let e of L)C.unshift(G2(e))}else V!==void 0&&C.push(G2(V));return C}static _$Eu(V,C){let L=C.attribute;return L===!1?void 0:typeof L=="string"?L:typeof V=="string"?V.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(V=>this.enableUpdating=V),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(V=>V(this))}addController(V){(this._$EO??=new Set).add(V),this.renderRoot!==void 0&&this.isConnected&&V.hostConnected?.()}removeController(V){this._$EO?.delete(V)}_$E_(){let V=new Map,C=this.constructor.elementProperties;for(let L of C.keys())this.hasOwnProperty(L)&&(V.set(L,this[L]),delete this[L]);V.size>0&&(this._$Ep=V)}createRenderRoot(){let V=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return D5(V,this.constructor.elementStyles),V}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(V=>V.hostConnected?.())}enableUpdating(V){}disconnectedCallback(){this._$EO?.forEach(V=>V.hostDisconnected?.())}attributeChangedCallback(V,C,L){this._$AK(V,L)}_$ET(V,C){let L=this.constructor.elementProperties.get(V),e=this.constructor._$Eu(V,L);if(e!==void 0&&L.reflect===!0){let r=(L.converter?.toAttribute!==void 0?L.converter:P1).toAttribute(C,L.type);this._$Em=V,r==null?this.removeAttribute(e):this.setAttribute(e,r),this._$Em=null}}_$AK(V,C){let L=this.constructor,e=L._$Eh.get(V);if(e!==void 0&&this._$Em!==e){let r=L.getPropertyOptions(e),t=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:P1;this._$Em=e;let a=t.fromAttribute(C,r.type);this[e]=a??this._$Ej?.get(e)??a,this._$Em=null}}requestUpdate(V,C,L,e=!1,r){if(V!==void 0){let t=this.constructor;if(e===!1&&(r=this[V]),L??=t.getPropertyOptions(V),!((L.hasChanged??H2)(r,C)||L.useDefault&&L.reflect&&r===this._$Ej?.get(V)&&!this.hasAttribute(t._$Eu(V,L))))return;this.C(V,C,L)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(V,C,{useDefault:L,reflect:e,wrapped:r},t){L&&!(this._$Ej??=new Map).has(V)&&(this._$Ej.set(V,t??C??this[V]),r!==!0||t!==void 0)||(this._$AL.has(V)||(this.hasUpdated||L||(C=void 0),this._$AL.set(V,C)),e===!0&&this._$Em!==V&&(this._$Eq??=new Set).add(V))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(C){Promise.reject(C)}let V=this.scheduleUpdate();return V!=null&&await V,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,r]of this._$Ep)this[e]=r;this._$Ep=void 0}let L=this.constructor.elementProperties;if(L.size>0)for(let[e,r]of L){let{wrapped:t}=r,a=this[e];t!==!0||this._$AL.has(e)||a===void 0||this.C(e,void 0,r,a)}}let V=!1,C=this._$AL;try{V=this.shouldUpdate(C),V?(this.willUpdate(C),this._$EO?.forEach(L=>L.hostUpdate?.()),this.update(C)):this._$EM()}catch(L){throw V=!1,this._$EM(),L}V&&this._$AE(C)}willUpdate(V){}_$AE(V){this._$EO?.forEach(C=>C.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(V)),this.updated(V)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(V){return!0}update(V){this._$Eq&&=this._$Eq.forEach(C=>this._$ET(C,this[C])),this._$EM()}updated(V){}firstUpdated(V){}};G.elementStyles=[],G.shadowRootOptions={mode:"open"},G[T1("elementProperties")]=new Map,G[T1("finalized")]=new Map,E7?.({ReactiveElement:G}),(C2.reactiveElementVersions??=[]).push("2.1.2");var H5=globalThis,N5=H=>H,V2=H5.trustedTypes,W5=V2?V2.createPolicy("lit-html",{createHTML:H=>H}):void 0,q5="$lit$",V1=`lit$${Math.random().toFixed(9).slice(2)}$`,Y5="?"+V1,j7=`<${Y5}>`,n1=document,z1=()=>n1.createComment(""),R1=H=>H===null||typeof H!="object"&&typeof H!="function",V5=Array.isArray,N7=H=>V5(H)||typeof H?.[Symbol.iterator]=="function",Q2=`[ 	
\f\r]`,B1=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,I5=/-->/g,U5=/>/g,o1=RegExp(`>|${Q2}(?:([^\\s"'>=/]+)(${Q2}*=${Q2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),K5=/'/g,G5=/"/g,X5=/^(?:script|style|textarea|title)$/i,L5=H=>(V,...C)=>({_$litType$:H,strings:V,values:C}),i=L5(1),d=L5(2),e9=L5(3),A1=Symbol.for("lit-noChange"),s=Symbol.for("lit-nothing"),Q5=new WeakMap,a1=n1.createTreeWalker(n1,129);function J5(H,V){if(!V5(H)||!H.hasOwnProperty("raw"))throw Error("invalid template strings array");return W5!==void 0?W5.createHTML(V):V}var W7=(H,V)=>{let C=H.length-1,L=[],e,r=V===2?"<svg>":V===3?"<math>":"",t=B1;for(let a=0;a<C;a++){let M=H[a],n,A,p=-1,m=0;for(;m<M.length&&(t.lastIndex=m,A=t.exec(M),A!==null);)m=t.lastIndex,t===B1?A[1]==="!--"?t=I5:A[1]!==void 0?t=U5:A[2]!==void 0?(X5.test(A[2])&&(e=RegExp("</"+A[2],"g")),t=o1):A[3]!==void 0&&(t=o1):t===o1?A[0]===">"?(t=e??B1,p=-1):A[1]===void 0?p=-2:(p=t.lastIndex-A[2].length,n=A[1],t=A[3]===void 0?o1:A[3]==='"'?G5:K5):t===G5||t===K5?t=o1:t===I5||t===U5?t=B1:(t=o1,e=void 0);let x=t===o1&&H[a+1].startsWith("/>")?" ":"";r+=t===B1?M+j7:p>=0?(L.push(n),M.slice(0,p)+q5+M.slice(p)+V1+x):M+V1+(p===-2?a:x)}return[J5(H,r+(H[C]||"<?>")+(V===2?"</svg>":V===3?"</math>":"")),L]},F1=class H{constructor({strings:V,_$litType$:C},L){let e;this.parts=[];let r=0,t=0,a=V.length-1,M=this.parts,[n,A]=W7(V,C);if(this.el=H.createElement(n,L),a1.currentNode=this.el.content,C===2||C===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(e=a1.nextNode())!==null&&M.length<a;){if(e.nodeType===1){if(e.hasAttributes())for(let p of e.getAttributeNames())if(p.endsWith(q5)){let m=A[t++],x=e.getAttribute(p).split(V1),Z=/([.?@])?(.*)/.exec(m);M.push({type:1,index:r,name:Z[2],strings:x,ctor:Z[1]==="."?Y2:Z[1]==="?"?X2:Z[1]==="@"?J2:f1}),e.removeAttribute(p)}else p.startsWith(V1)&&(M.push({type:6,index:r}),e.removeAttribute(p));if(X5.test(e.tagName)){let p=e.textContent.split(V1),m=p.length-1;if(m>0){e.textContent=V2?V2.emptyScript:"";for(let x=0;x<m;x++)e.append(p[x],z1()),a1.nextNode(),M.push({type:2,index:++r});e.append(p[m],z1())}}}else if(e.nodeType===8)if(e.data===Y5)M.push({type:2,index:r});else{let p=-1;for(;(p=e.data.indexOf(V1,p+1))!==-1;)M.push({type:7,index:r}),p+=V1.length-1}r++}}static createElement(V,C){let L=n1.createElement("template");return L.innerHTML=V,L}};function S1(H,V,C=H,L){if(V===A1)return V;let e=L!==void 0?C._$Co?.[L]:C._$Cl,r=R1(V)?void 0:V._$litDirective$;return e?.constructor!==r&&(e?._$AO?.(!1),r===void 0?e=void 0:(e=new r(H),e._$AT(H,C,L)),L!==void 0?(C._$Co??=[])[L]=e:C._$Cl=e),e!==void 0&&(V=S1(H,e._$AS(H,V.values),e,L)),V}var q2=class{constructor(V,C){this._$AV=[],this._$AN=void 0,this._$AD=V,this._$AM=C}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(V){let{el:{content:C},parts:L}=this._$AD,e=(V?.creationScope??n1).importNode(C,!0);a1.currentNode=e;let r=a1.nextNode(),t=0,a=0,M=L[0];for(;M!==void 0;){if(t===M.index){let n;M.type===2?n=new D1(r,r.nextSibling,this,V):M.type===1?n=new M.ctor(r,M.name,M.strings,this,V):M.type===6&&(n=new C5(r,this,V)),this._$AV.push(n),M=L[++a]}t!==M?.index&&(r=a1.nextNode(),t++)}return a1.currentNode=n1,e}p(V){let C=0;for(let L of this._$AV)L!==void 0&&(L.strings!==void 0?(L._$AI(V,L,C),C+=L.strings.length-2):L._$AI(V[C])),C++}},D1=class H{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(V,C,L,e){this.type=2,this._$AH=s,this._$AN=void 0,this._$AA=V,this._$AB=C,this._$AM=L,this.options=e,this._$Cv=e?.isConnected??!0}get parentNode(){let V=this._$AA.parentNode,C=this._$AM;return C!==void 0&&V?.nodeType===11&&(V=C.parentNode),V}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(V,C=this){V=S1(this,V,C),R1(V)?V===s||V==null||V===""?(this._$AH!==s&&this._$AR(),this._$AH=s):V!==this._$AH&&V!==A1&&this._(V):V._$litType$!==void 0?this.$(V):V.nodeType!==void 0?this.T(V):N7(V)?this.k(V):this._(V)}O(V){return this._$AA.parentNode.insertBefore(V,this._$AB)}T(V){this._$AH!==V&&(this._$AR(),this._$AH=this.O(V))}_(V){this._$AH!==s&&R1(this._$AH)?this._$AA.nextSibling.data=V:this.T(n1.createTextNode(V)),this._$AH=V}$(V){let{values:C,_$litType$:L}=V,e=typeof L=="number"?this._$AC(V):(L.el===void 0&&(L.el=F1.createElement(J5(L.h,L.h[0]),this.options)),L);if(this._$AH?._$AD===e)this._$AH.p(C);else{let r=new q2(e,this),t=r.u(this.options);r.p(C),this.T(t),this._$AH=r}}_$AC(V){let C=Q5.get(V.strings);return C===void 0&&Q5.set(V.strings,C=new F1(V)),C}k(V){V5(this._$AH)||(this._$AH=[],this._$AR());let C=this._$AH,L,e=0;for(let r of V)e===C.length?C.push(L=new H(this.O(z1()),this.O(z1()),this,this.options)):L=C[e],L._$AI(r),e++;e<C.length&&(this._$AR(L&&L._$AB.nextSibling,e),C.length=e)}_$AR(V=this._$AA.nextSibling,C){for(this._$AP?.(!1,!0,C);V!==this._$AB;){let L=N5(V).nextSibling;N5(V).remove(),V=L}}setConnected(V){this._$AM===void 0&&(this._$Cv=V,this._$AP?.(V))}},f1=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(V,C,L,e,r){this.type=1,this._$AH=s,this._$AN=void 0,this.element=V,this.name=C,this._$AM=e,this.options=r,L.length>2||L[0]!==""||L[1]!==""?(this._$AH=Array(L.length-1).fill(new String),this.strings=L):this._$AH=s}_$AI(V,C=this,L,e){let r=this.strings,t=!1;if(r===void 0)V=S1(this,V,C,0),t=!R1(V)||V!==this._$AH&&V!==A1,t&&(this._$AH=V);else{let a=V,M,n;for(V=r[0],M=0;M<r.length-1;M++)n=S1(this,a[L+M],C,M),n===A1&&(n=this._$AH[M]),t||=!R1(n)||n!==this._$AH[M],n===s?V=s:V!==s&&(V+=(n??"")+r[M+1]),this._$AH[M]=n}t&&!e&&this.j(V)}j(V){V===s?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,V??"")}},Y2=class extends f1{constructor(){super(...arguments),this.type=3}j(V){this.element[this.name]=V===s?void 0:V}},X2=class extends f1{constructor(){super(...arguments),this.type=4}j(V){this.element.toggleAttribute(this.name,!!V&&V!==s)}},J2=class extends f1{constructor(V,C,L,e,r){super(V,C,L,e,r),this.type=5}_$AI(V,C=this){if((V=S1(this,V,C,0)??s)===A1)return;let L=this._$AH,e=V===s&&L!==s||V.capture!==L.capture||V.once!==L.once||V.passive!==L.passive,r=V!==s&&(L===s||e);e&&this.element.removeEventListener(this.name,this,L),r&&this.element.addEventListener(this.name,this,V),this._$AH=V}handleEvent(V){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,V):this._$AH.handleEvent(V)}},C5=class{constructor(V,C,L){this.element=V,this.type=6,this._$AN=void 0,this._$AM=C,this.options=L}get _$AU(){return this._$AM._$AU}_$AI(V){S1(this,V)}};var I7=H5.litHtmlPolyfillSupport;I7?.(F1,D1),(H5.litHtmlVersions??=[]).push("3.3.3");var C3=(H,V,C)=>{let L=C?.renderBefore??V,e=L._$litPart$;if(e===void 0){let r=C?.renderBefore??null;L._$litPart$=e=new D1(V.insertBefore(z1(),r),r,void 0,C??{})}return e._$AI(H),e};var e5=globalThis,z=class extends G{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let V=super.createRenderRoot();return this.renderOptions.renderBefore??=V.firstChild,V}update(V){let C=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(V),this._$Do=C3(C,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A1}};z._$litElement$=!0,z.finalized=!0,e5.litElementHydrateSupport?.({LitElement:z});var U7=e5.litElementPolyfillSupport;U7?.({LitElement:z});(e5.litElementVersions??=[]).push("4.2.2");var K7={attribute:!0,type:String,converter:P1,reflect:!1,hasChanged:H2},G7=(H=K7,V,C)=>{let{kind:L,metadata:e}=C,r=globalThis.litPropertyMetadata.get(e);if(r===void 0&&globalThis.litPropertyMetadata.set(e,r=new Map),L==="setter"&&((H=Object.create(H)).wrapped=!0),r.set(C.name,H),L==="accessor"){let{name:t}=C;return{set(a){let M=V.get.call(this);V.set.call(this,a),this.requestUpdate(t,M,H,!0,a)},init(a){return a!==void 0&&this.C(t,void 0,H,a),a}}}if(L==="setter"){let{name:t}=C;return function(a){let M=this[t];V.call(this,a),this.requestUpdate(t,M,H,!0,a)}}throw Error("Unsupported decorator location: "+L)};function c(H){return(V,C)=>typeof C=="object"?G7(H,V,C):((L,e,r)=>{let t=e.hasOwnProperty(r);return e.constructor.createProperty(r,L),t?Object.getOwnPropertyDescriptor(e,r):void 0})(H,V,C)}function v(H){return c({...H,state:!0,attribute:!1})}var e2={title:"SwitchBot",common:{back:"Back",save:"Save",cancel:"Cancel",delete:"Delete",rename:"Rename",done:"Done",add:"Add",reset:"Reset",read:"Read",load:"Load",reload:"Reload",yes:"yes",no:"no",unavailable:"unavailable",loading:"Loading\u2026",open_device:"Device page in Home Assistant",show_advertisements:"Show BLE advertisements for this address",lock:"Lock",unlock:"Unlock",no_entities:"This device has no entities here."},devices:{intro:"Pick a device to see its status, settings and the functions the SwitchBot app offers.",none:"No SwitchBot device is set up.",groups:{lock:"Locks",keypad:"Keypads",cover:"Curtains and blinds",light:"Lights",switch:"Switches",appliance:"Appliances",sensor:"Sensors",plug:"Plugs",other:"Other devices"}},sections:{overview:"Overview",correction:"Calibration",calibration:"Calibration",settings:"Settings",history:"History",passcodes:"Passcodes",cards:"NFC cards"},overview:{status:"Status",diagnostics:"Diagnostics",controls:"Controls"},controls:{open:"Open",close:"Close",stop:"Stop",start:"Start",dock:"Return to dock"},settings:{none:"This device has no settings in Home Assistant.",note:"Changes are written to the device over Bluetooth.",press:"Press"},demo:{toggle:"Demo",banner:"Demo mode: every device here is simulated and exists only in this browser. Your real devices are hidden and nothing is sent to them.",knob:"Turn the knob +20\xB0",door:"Open / close door",code:"Enter a passcode",card:"Tap a card",wrong:"3 wrong codes",tamper:"Pull off the mount",lock:{turn_locked:"Turn the knob to locked",turn_unlocked:"Turn the knob to unlocked",release_latch:"Unlock fully, release where the latch extends",turn_half:"Turn the knob to half-locked",door_ajar:"Open the door ~10 cm",door_against:"Hold the door against the frame",door_close:"Close the door",lock_manual:"Lock by hand",block:"Motor jams",nomagnet:"No magnet",lowbatt:"Low battery",timeout:"No answer (timeout)"},cover:{pull:"Pull the curtain 5 cm",turn:"Turn the wand",wrong_way:"Turn the wrong way",block:"Obstacle (stuck)",timeout:"Motor never stops",short:"Route too short",nomagnet:"No magnet",lowbatt:"Low battery"}},sensor:{intro:"Correct readings that differ from a trusted reference. The offset is added in Home Assistant to the value the sensor sends; the device and the SwitchBot app are not changed.",devcal_intro:"Corrections of this sensor are written to the sensor itself over Bluetooth, so its display, the SwitchBot app and Home Assistant show the same values. New readings arrive with the next measurement.",waiting:"Waiting for data\u2026",temperature:"Temperature",humidity:"Humidity",co2:"CO\u2082",raw:"Sensor reading",raw_device:"Measured by the sensor",offset:"Offset",offset_device:"Correction",result:"Value in Home Assistant",result_device:"Value after correction",reference:"Reference reading",reference_hint:"Enter the value of a trusted meter and press Calculate",apply_ref:"Calculate",save_device:"Save to sensor",saved:"Saved",saved_device:"Saved in the sensor",limit:"Allowed range: {min} \u2026 {max}",whole_percent:"whole percent only",devcal_busy:"Connecting to the sensor\u2026",stored_in_sensor:"stored in the sensor"},lock:{live:"Live status",state:"State",door:"Door",door_open:"open",door_closed:"closed",calibrated:"Calibrated",battery:"Battery",angle:"Knob angle",offline:"Lock not reachable over Bluetooth",connecting:"Connecting to the lock\u2026",states:["locked","unlocked","locking\u2026","unlocking\u2026","blocked while locking","blocked while unlocking","latch","half-locked"],lock_type:"Lock type",type_eu:"EU",type_other:"other",latch:"Latch",latch_night:"night latch",latch_normal:"normal",choose:"Choose a calibration",experimental:"Experimental: built from the SwitchBot app's calibration flow. Stay at the door while calibrating.",low_battery:"Unavailable due to low battery. Replace or charge the main battery before calibrating.",modes:{auto:"Automatic calibration",auto_desc:"You set the unlocked position, the lock finds the locked one by itself. Recommended.",manual:"Manual calibration",manual_desc:"You turn the knob to the locked and unlocked positions yourself.",half:"Half-lock position",half_desc:"Set the partially locked position (EU locks). Partially-Lock is switched on afterwards.",door:"Door sensor (magnet)",door_desc:"Teach the lock what an ajar and a closed door look like.",pro:"Calibration (Lock Pro)",pro_desc:"Same steps as the SwitchBot app: locked and unlocked position, door ajar, then the tests.",lock1:"Calibration (Lock)",lock1_desc:"Same steps as the SwitchBot app: locked and unlocked position, door against the frame, then the tests.",lite:"Calibration (Lock Lite)",lite_desc:"Same steps as the SwitchBot app: locked and unlocked position, then the tests."},next:"Next",finish:"Finish",correct:"Correct",no:"No",test_lock:"Test Locking",test_unlock:"Test Unlocking",try_again:"Try Again",skip:"Skip",calibrate_magnet:"Calibrate Magnet",recalibrate:"Calibrate again",check_done:"Done",done_lock:"Lock the door",starting:"Entering calibration mode\u2026",working:"The lock is moving\u2026",saving:"Saving\u2026",testing_lock:"Testing: locking\u2026",testing_unlock:"Testing: unlocking\u2026",testing_half:"Testing the half-lock position\u2026",cancelling:"Restoring the previous calibration\u2026",err_timeout:"The lock did not report the expected position in time.",err_blocked:"The motor is blocked.",err_command:"The lock rejected the command or is not reachable.",step:"Step {n} of {total}",confirm_cancel:"Cancel calibration? The previous calibration will be restored.",latch_night_lock:"Night Latch Lock",latch_night_desc:"You need a key to open your unlocked door from the outside.",latch_one_piece:"One-Piece Lock",latch_one_piece_desc:"Your lock has no latch, or the latch is opened by the outside handle.",hint_unlock_first:"Unlock first: turn the knob at least {deg}\xB0 away from the locked position.",hint_no_latch:"The latch was not detected. Turn the knob until the door is fully unlocked, then release it where the latch extends. If it still fails, check the installation and calibrate again.",hint_lock_first:"The lock is unlocked: lock it first.",hint_lock_by_hand:"Lock the lock by hand first (turn the knob to the locked position).",hint_unlock_test:"The lock must be unlocked before the locking test.",hint_turn:"Turn the knob at least {deg}\xB0 to the half-lock position.",hint_turn_unlock:"Turn the knob to the unlocked position first.",hint_lock_type:"Waiting for the lock to report its lock type\u2026",latch_need_key:"No, I need a key",latch_no_key:"Yes, I don't need a key",self_adjusting:"Jammed, self-adjusting\u2026",emergency_power:"Emergency Power initiated.",jam_title:"Jammed",jam_text:`The motor stopped before it reached the position, so the step was not saved. Please check:
1. Whether your door is closed tightly and nothing obstructs the latch or the deadbolt.
2. Whether the lock is installed correctly according to the guide.
Then calibrate again from the start.`,jam_check_install:"Check the installation",jam_install:`Calibration cancelled, the previous calibration is restored.
Check that the lock sits straight over the knob, the adapter fits, the deadbolt and the latch move freely and the door closes tightly. Then calibrate again.`,demo_hint:"Demo, what you do at the door:",steps:{latch_title:"Select the door lock type",latch_text:"Choose by how your door opens from the outside when it is unlocked.",auto1_title:"Set the unlocked position",auto1_text:`1. Open and hold your door.
2. Make sure the lock is unlocked (turn the knob until the door is unlocked), then tap Next.
The lock saves this position and turns to the locked position by itself. With the door open the deadbolt goes out into the air instead of into the strike.`,auto1_nl_title:"Set the unlocked position",auto1_nl_text:`1. Open and hold your door.
2. Make sure the lock is unlocked, then tap Next.
\u2460 The latch should remain extended. \u2461 The deadbolt should disengage.
The lock then turns to the locked position by itself.`,auto2_title:"Check the locked position",auto2_text:"Check if the deadbolt fully extends. Open your door so you can check the lock's status.",auto2_nl_title:"Check the locked position",auto2_nl_text:"Check if the latch fully extends. Open your door so you can check the lock's status.",auto3_title:"Check the unlocked position",auto3_text:"Check if the deadbolt disengages. Correct saves the calibration.",auto3_nl_title:"Check the unlocked position",auto3_nl_text:"Check if \u2460 the latch fully extends, and \u2461 the deadbolt disengages. Correct saves the calibration.",g1_title:"Turn to the locked position",g1_text:"Rotate the knob until the deadbolt fully extends. Open your door so you can check. Then tick Done and tap Next.",g1_nl_title:"Turn to the locked position",g1_nl_text:"Rotate the knob until the latch fully extends. Open your door so you can check. Then tick Done and tap Next.",g2_title:"Turn to the unlocked position",g2_text:"Rotate the knob until the deadbolt disengages. Then tick Done and tap Test Locking.",g2_nl_title:"Turn to the unlocked position",g2_nl_text:"Rotate the knob until \u2460 the latch fully extends, and \u2461 the deadbolt disengages. Then tick Done and tap Test Locking.",g3_title:"Test unlocking",g3_text:"Check if the deadbolt fully extends. Open your door so you can check the lock's status. Then tap Test Unlocking.",g3_nl_title:"Test unlocking",g3_nl_text:"Check if the deadbolt fully extends. Open your door so you can check the lock's status. Then tap Test Unlocking: the lock unlocks and holds the latch released for 3 seconds.",m1_title:"Turn to the locked position",m1_text:"Rotate the knob until the deadbolt fully extends. Open your door so you can check the lock's status. Then tap Next.",m2_title:"Turn to the unlocked position",m2_text:"Rotate the knob until the deadbolt disengages, then tap Test Locking. The lock then locks by itself.",m2_nl_title:"Unlock and release the knob",m2_nl_text:`1. Keep your door closed.
2. Rotate the knob until the door is fully unlocked.
3. Release the knob to the position where the latch extends.
4. Tap Test Locking.`,p1_title:"Close the door and lock",p1_text:`1. Close your door.
2. Rotate the knob to the position where the lock locks your door. Then tap Next.`,p2_title:"Turn to the unlocked position",p2_text:`1. Keep your door closed.
2. Rotate the knob to the position where the lock unlocks your door. Then tap Next.`,p2_nl_title:"Unlock and release the knob",p2_nl_text:`1. Keep your door closed.
2. Rotate the knob until the door is fully unlocked.
3. Release the knob to the position where the latch extends.
4. Tap Next.`,p3_title:"Door ajar, lock by hand",p3_text:`1. Open your door and hold it about 10 cm (3.9 in.) from the door frame.
2. Lock the lock by hand.
3. Tap Next.`,nomagnet_pro_title:"Magnet not detected",nomagnet_pro_text:`\u2022 The magnet was not detected. Auto-Lock will be unavailable.
\u2022 Open your door, keep the deadbolt against the door frame and tap Try Again.
Skip records the door position anyway.`,p4_title:"Test unlocking",p4_text:`1. Keep your door ajar and make sure the lock is locked.
2. Tap Test Unlocking.`,p5_title:"Test locking",p5_text:`1. Close your door. The lock should be unlocked now.
2. Tap Test Locking.`,half1_title:"Set the half-lock position",half1_text:`1. Open your door.
2. Rotate the knob to the partially locked position.
3. Tap Next: the lock saves the position and tests it.`,half2_title:"Check the half-lock position",half2_text:"Check if the deadbolt is half engaged.",half_done_title:"Half-lock calibrated",half_done_text:"The position is saved and Partially-Lock is switched on.",door1_title:"Door ajar, lock unlocked",door1_text:`Keep the lock unlocked. Open your door and hold it about 10 cm (3.9 in.) from the door frame, then tap Next.
Note: calibrate the magnet with the battery cover closed.`,door2_title:"Close the door",door2_text:`1. Keep the lock unlocked and close your door.
2. Tap Next. The lock locks by itself when the magnet calibration finishes.`,nomagnet_door_title:"Magnet not detected",nomagnet_door_text:`\u2022 The magnet was not detected. Auto-Lock will be unavailable.
\u2022 Open your door, keep the deadbolt against the door frame and tap Try Again.`,door_done_title:"Magnet calibrated",door_done_text:"Calibrated successfully.",done_title:"Calibrated successfully",done_text:"The new calibration is active.",done_magnet_title:"Calibrated successfully",done_magnet_text:"The new calibration is active. The door sensor magnet is not calibrated: calibrate it now so that Auto-Lock and the door state work, or skip it.",close_title:"Close the door and lock",close_text:`1. Keep the lock unlocked and close your door.
2. Tap Lock the door.`,l1_title:"Close the door and lock",l1_text:"Close your door and lock your device manually. Then tap Next.",l2_title:"Turn to the unlocked position",l2_text:`Now turn the knob until your door is fully unlocked, then release the knob slowly. Then tap Next.
Hint: turn the knob right where it unlocks.`,latch1_title:"Does your door have a latch?",latch1_text:"The lock found a latch. Can you open your unlocked door from the outside without a key?",l3_title:"Door against the frame, lock by hand",l3_text:"Open your door and lock the lock by hand. Hold the door tightly against the door frame and then tap Next.",l3_nl_title:"Door against the frame, lock by hand",l3_nl_text:"Open your door and lock the lock by hand. Hold the door tightly against the door frame and then tap Next.",l4_title:"Test unlocking",l4_text:"Leave a gap, tap Test Unlocking and the lock will unlock.",l4_nl_title:"Test unlocking",l4_nl_text:"Make sure your door is ajar and tap Test Unlocking: the lock unlocks and holds the latch released for 3 seconds.",l5_title:"Test locking",l5_text:"Close your door and tap Test Locking.",t1_title:"Turn to the locked position",t1_text:"Rotate the knob until the deadbolt fully extends. Open your door so you can check the lock's status. Then tap Next.",t2_title:"Turn to the unlocked position",t2_text:"Rotate the knob until the deadbolt disengages. Open your door so you can check the lock's status. Then tap Test Locking: the lock locks by itself.",t3_title:"Test unlocking",t3_text:"Check if the deadbolt fully extends. Open your door so you can check the lock's status. Then tap Test Unlocking.",t4_title:"Close the door",t4_text:`1. Keep the lock unlocked and close your door.
2. Tap Next. The lock locks by itself and the calibration is saved.`}},history:{intro:"Records the device wrote since Home Assistant started reading them (read after every operation). Older entries stay in the SwitchBot app.",empty:"No records.",no_entity:"The history entity of this device is not available.",days:"Last {n} days",unknown_cred:"unknown",lock_sources:{app:"app",widget:"widget",scene:"scene",nfc_tag:"NFC tag",open_api:"API",remote:"remote",alexa:"Alexa",google:"Google",matter:"Matter",siri:"Siri",key:"key",keypad:"keypad",manual:"by hand",auto_lock:"auto-lock",force_auto_lock:"auto-lock",emergency:"emergency",unknown:""},credentials:{passcode:"passcode",nfc_card:"card",fingerprint:"fingerprint",face:"face",palm_vein:"palm",keypad_button:"button"},lock_events:{locked:"Locked",lock_failed:"Lock failed",half_locked:"Half-locked",latch_released:"Latch released",latch_release_failed:"Latch release failed",unlocked:"Unlocked",unlock_failed:"Unlock failed",emergency_unlock:"Emergency unlock",door_left_open:"Door left open",left_unlocked:"Left unlocked",low_temperature:"Low temperature",low_power:"Low battery",work_mode:"Work mode changed"}},keypad:{battery:"Battery",charging:"charging",firmware:"Firmware",on_device:"On the keypad",on_device_value:"{p} passcodes, {c} cards",lockout:"Locked out after wrong attempts",lockout_kinds:{passcode:"passcodes",nfc:"cards",fingerprint:"fingerprints"},lift:"Lift",tamper:"Tamper alarm: keypad removed from its mount",clear:"Clear",duress:"Duress alarm",busy:"Connecting to the keypad\u2026",none_yet:"None added from Home Assistant yet.",add_code:"Add passcode",add_card:"Add card",name:"Name",name_ph:"e.g. Guest, Cleaner",code:"Code (6\u201312 digits)",generate:"Random",type:"Type",types:{permanent:"Permanent",time_limited:"Time-limited",one_time:"One-time",emergency:"Emergency",periodic:"Recurring",unknown:"Unknown"},valid_from:"Valid from",valid_to:"Valid until",days:"Days",weekdays:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],hours:"Hours",always:"always",confirm_delete:'Delete "{name}" from the keypad?',code_saved:"Passcode #{index} saved: {code}. Write it down now; Home Assistant does not keep it.",existing:"Name a code or card created in the SwitchBot app",index:"No.",nfc_wait:"Hold the card against the keypad\u2026",nfc_left:"{s} s left",nfc_status:{success:"Card read.",failed:"Reading failed. Try again.",already_exists:"This card is already added.",timeout:"No card detected.",not_dedicated_card:"This card type is not supported."},events:{unlocked:"Unlocked",unlock_failed:"Unlock failed",verification_failed:"Wrong code / card",expired_credential:"Expired credential",locked:"Locked (button)",lock_failed:"Lock failed",low_battery:"Low battery",locked_out:"Locked out",tamper:"Removed from mount",doorbell:"Doorbell",doorbell_scene:"Doorbell scene",unknown:"Unknown event"},sources:{passcode:"passcode",nfc:"card",fingerprint:"fingerprint",lock_button:"button",alarm:"alarm",face:"face",doorbell:"doorbell",palm_vein:"palm"}},cover:{live:"Live status",connecting:"Connecting\u2026",offline:"Not reachable over Bluetooth",state:"State",position:"Open",tilt:"Tilt",calibrated:"Calibrated",battery:"Battery",firmware:"Firmware",mount:"Mount",mounts:{u_rail:"U rail",i_rail:"I rail",rod:"rod"},slats:"Slats",slat:{horizontal:"horizontal",vertical:"vertical"},motion:{stopped:"stopped",opening:"opening",closing:"closing",moving:"moving",stuck:"stuck"},choose:"Calibration",intro:{curtain_3:"Calibration teaches the robot where the curtain is fully open and fully closed. It clears the current calibration; the curtain cannot be moved to a position until it is calibrated again.",curtain_track_4:"Calibration teaches the robot where the curtain is fully open and fully closed. It clears the current calibration; the curtain cannot be moved to a position until it is calibrated again.",roller_shade:"Calibration sets the rolling direction and the rolled-up and closed positions of the fabric. Stay at the window: you set the positions with the buttons.",blind_tilt:"Calibration records four slat positions. You turn the tilt wand by hand; the Blind Tilt only saves the positions."},experimental:"Built from the SwitchBot app without the device at hand: the steps follow the app, but this wizard has not been tried on a real device yet.",err_battery:"Battery below {min}%: charge the device before calibrating.",modes:{smart:"Smart calibration",smart_desc:"The robot finds both ends of the track by itself.",custom:"Custom calibration",custom_desc:"You set the open and closed positions with the buttons.",correction:"Smart Correction",correction_desc:"Re-learns the track after the curtain drifted; the last calibration was automatic.",full:"Calibration",full_desc:"Rolling direction, rolled-up and closed positions.",route:"Route correction",route_desc:"Re-learns the rolled-up position when the route has drifted; the set positions stay.",tilt:"Calibration",tilt_desc:"Four slat positions, turned by hand."},step:"Step {n} of {total}",next:"Next",finish:"Finish",done:"Done",pause:"Pause",back_to_start:"Back to the start",confirm_cancel:"Leave the calibration? The device leaves calibration mode and the new data is lost.",starting:"Starting the calibration\u2026",cancelling:"Leaving the calibration\u2026",saving:"Saving\u2026",checking_route:"Checking the travelled distance\u2026",driving_open:"Moving to the open end\u2026",driving_closed:"Moving to the closed end\u2026",waiting_pull:"Waiting for you to pull the curtain\u2026",correcting:"Correcting the track\u2026",magnet_checking:"Looking for the magnet\u2026",rolling_up:"Rolling up\u2026",route_rolling:"Rolling up for the route correction\u2026",jog_left:"Move left",jog_right:"Move right",jog_up:"Roll up",jog_down:"Roll down",demo_hint:"Demo: do what the step asks with this button.",jog_hint:"Tap a direction to move, tap it again to stop.",jog_first:"Move the shade with the buttons first.",blind_turn_more:"Turn the wand further: the Blind Tilt enables Next once it has registered the turn.",auto_close:"Close automatically",logo_check:"The logo of the robot faces the room",close_check:"The curtain is fully closed",magnet_detect:"Detect magnet",magnet_skip:"Skip",open_left:"Opens to the left",open_right:"Opens to the right",logo_inside:"Logo towards the room",logo_outside:"Logo towards the window",start_calibration:"Start calibration",recalibrate:"Calibrate again",finish_anyway:"Finish anyway",roll_standard:"Standard roll",roll_reverse:"Reverse roll",rolled_up:"Fully rolled up",is_stuck:"It is stuck",continue_route:"Continue the correction",continue_calibration:"Continue the calibration",err_command:"The device rejected the command.",err_stuck:"The device stopped: something blocks it. Remove the obstacle and calibrate again.",err_timeout:"The device did not finish in time. Check that nothing blocks it and calibrate again.",err_magnet:"No magnet found at the end of the rail. Place the magnet as in the manual, or skip this step.",err_wrong_way:"The wand was turned the wrong way: open and closed positions would not match. Calibrate again and turn as shown.",err_open_below_closed:"The rolled-up position you set is below or at the closed position. Calibrate again.",steps:{curtain:{logo_title:"Check how the robot hangs",logo_text:"The robot must hang on the rail with its logo facing the room. Tick the box when it does.",mount_title:"Which way does the logo face?",mount_text:"Track 4 can be mounted either way. Choose the side the logo faces; the robot sets its motor direction from it.",close_title:"Close the curtain",close_text:"Pull the curtain fully closed by hand, with the robot at the closed end.",magnet_title:"Positioning magnet",magnet_text:"With the magnet at the end of the rail the robot finds the closed position precisely. Detect it now, or skip if you have none.",openSide_title:"Where does the curtain open to?",openSide_text:"Choose the side the curtain gathers at when it is open.",calibrating_title:"Calibrating",calibrating_text:"The robot drives to the open end, then back to the closed end. Do not touch the curtain.",pull_title:"Pull the curtain open",pull_text:"Pull the curtain about 5 cm towards the open side. The robot takes over and finds the open end by itself.",manualOpen_title:"Set the open position",manualOpen_text:"The robot drives to the open end. Correct the position with the arrows, then let it close automatically.",manualClose_title:"Set the closed position",manualClose_text:"The robot drives back to the closed end. Correct it with the arrows if needed and finish.",short_title:"The track is very short",short_text:"The robot travelled less than 10 cm (fewer than 16 motor steps). Calibrate again, or keep it if that is right.",fixing_title:"Smart Correction",fixing_text:"The robot drives along the track and corrects the stored ends.",done_title:"Calibration finished",done_text:"The curtain can be controlled again."},roller_shade:{direction_title:"Choose the rolling direction",direction_text:"Standard roll: the fabric hangs from the front of the tube (outside the window frame). Reverse roll: from the back (inside the frame, e.g. with window handles).",rollUp_title:"Rolling up",rollUp_text:"The shade rolls up until the motor stops at the top.",routeUp_title:"Rolling up",routeUp_text:"The shade rolls up to re-learn the top position.",stuckSel_title:"The shade stopped",stuckSel_text:"Is it fully rolled up, or is it stuck?",stuckHelp_title:"The shade is stuck",stuckHelp_text:"Check that the fabric is not caught and nothing blocks the bottom bar, then continue.",setOpen_title:"Set the rolled-up position",setOpen_text:"Move the shade with the arrows to where it should stop when open.",setClosed_title:"Set the closed position",setClosed_text:"Move the shade down to the shading position you like and finish.",done_title:"Calibration finished",done_text:"The shade can be controlled again."},blind_tilt:{b1_title:"Fully closed downwards",b1_text:"Turn the wand until the slats are fully closed downwards (do not turn them over). Then tap Next.",b2_title:"Fully open",b2_text:"Turn the wand back until the slats are fully open (horizontal). Then tap Next.",b3_title:"Fully closed upwards",b3_text:"Keep turning until the slats are fully closed upwards. Then tap Next.",b4_title:"Fully open again",b4_text:'Turn back to fully open. The number of turns to "open" differs coming from above or from below, so it is recorded twice.',done_title:"Calibration finished",b1v_title:"Fully closed to the left",b1v_text:"Turn the wand until the slats are fully closed to the left (do not turn them over). Then tap Next.",b2v_title:"Fully open",b2v_text:"Turn the wand back until the slats are fully open (square to the window). Then tap Next.",b3v_title:"Fully closed to the right",b3v_text:"Keep turning until the slats are fully closed to the right. Then tap Next.",b4v_title:"Fully open again",b4v_text:'Turn back to fully open. The number of turns to "open" differs coming from either side, so it is recorded twice.',done_text:"The Blind Tilt knows the slat positions now."}}}};var H3={title:"SwitchBot",common:{back:"Wr\xF3\u0107",save:"Zapisz",cancel:"Anuluj",delete:"Usu\u0144",rename:"Zmie\u0144 nazw\u0119",done:"Gotowe",add:"Dodaj",reset:"Wyzeruj",read:"Odczytaj",load:"Wczytaj",reload:"Od\u015Bwie\u017C",yes:"tak",no:"nie",unavailable:"niedost\u0119pny",loading:"Wczytywanie\u2026",open_device:"Strona urz\u0105dzenia w Home Assistant",show_advertisements:"Poka\u017C rozg\u0142oszenia BLE tego adresu",lock:"Zamknij",unlock:"Otw\xF3rz",no_entities:"To urz\u0105dzenie nie ma tu encji."},devices:{intro:"Wybierz urz\u0105dzenie, \u017Ceby zobaczy\u0107 jego stan, ustawienia i funkcje z aplikacji SwitchBot.",none:"Nie ma skonfigurowanych urz\u0105dze\u0144 SwitchBot.",groups:{lock:"Zamki",keypad:"Klawiatury",cover:"Zas\u0142ony i rolety",light:"O\u015Bwietlenie",switch:"Prze\u0142\u0105czniki",appliance:"Urz\u0105dzenia domowe",sensor:"Czujniki",plug:"Gniazdka",other:"Inne urz\u0105dzenia"}},sections:{overview:"Przegl\u0105d",correction:"Kalibracja",calibration:"Kalibracja",settings:"Ustawienia",history:"Historia",passcodes:"Kody PIN",cards:"Karty NFC"},overview:{status:"Stan",diagnostics:"Diagnostyka",controls:"Sterowanie"},controls:{open:"Otw\xF3rz",close:"Zamknij",stop:"Zatrzymaj",start:"Start",dock:"Wr\xF3\u0107 do stacji"},settings:{none:"To urz\u0105dzenie nie ma ustawie\u0144 w Home Assistant.",note:"Zmiany s\u0105 zapisywane w urz\u0105dzeniu przez Bluetooth.",press:"Naci\u015Bnij"},demo:{toggle:"Demo",banner:"Tryb demo: wszystkie urz\u0105dzenia s\u0105 symulowane i istniej\u0105 tylko w tej przegl\u0105darce. Prawdziwe urz\u0105dzenia s\u0105 ukryte i nic do nich nie trafia.",knob:"Obr\xF3\u0107 ga\u0142k\u0119 +20\xB0",door:"Otw\xF3rz / zamknij drzwi",code:"Wpisz kod",card:"Przy\u0142\xF3\u017C kart\u0119",wrong:"3 b\u0142\u0119dne kody",tamper:"Zdejmij z mocowania",lock:{turn_locked:"Przekr\u0119\u0107 pokr\u0119t\u0142o do zamkni\u0119cia",turn_unlocked:"Przekr\u0119\u0107 pokr\u0119t\u0142o do otwarcia",release_latch:"Otw\xF3rz do ko\u0144ca, pu\u015B\u0107 przy zatrzasku",turn_half:"Przekr\u0119\u0107 do p\xF3\u0142zamkni\u0119cia",door_ajar:"Uchyl drzwi na ~10 cm",door_against:"Doci\u015Bnij drzwi do futryny",door_close:"Zamknij drzwi",lock_manual:"Zamknij zamek r\u0119cznie",block:"Silnik si\u0119 blokuje",nomagnet:"Brak magnesu",lowbatt:"Niska bateria",timeout:"Brak odpowiedzi (czas)"},cover:{pull:"Poci\u0105gnij zas\u0142on\u0119 5 cm",turn:"Obr\xF3\u0107 dr\u0105\u017Cek",wrong_way:"Obr\xF3\u0107 w z\u0142\u0105 stron\u0119",block:"Przeszkoda (zablokowanie)",timeout:"Silnik si\u0119 nie zatrzymuje",short:"Za kr\xF3tka trasa",nomagnet:"Brak magnesu",lowbatt:"Niska bateria"}},sensor:{intro:"Popraw odczyty, kt\xF3re r\xF3\u017Cni\u0105 si\u0119 od zaufanego wzorca. Offset jest dodawany w Home Assistant do warto\u015Bci wysy\u0142anej przez czujnik; urz\u0105dzenie i aplikacja SwitchBot si\u0119 nie zmieniaj\u0105.",devcal_intro:"Korekty tego czujnika zapisuj\u0105 si\u0119 w samym czujniku przez Bluetooth, wi\u0119c jego wy\u015Bwietlacz, aplikacja SwitchBot i Home Assistant pokazuj\u0105 to samo. Nowe odczyty przyjd\u0105 z kolejnym pomiarem.",waiting:"Czekam na dane\u2026",temperature:"Temperatura",humidity:"Wilgotno\u015B\u0107",co2:"CO\u2082",raw:"Odczyt czujnika",raw_device:"Pomiar czujnika",offset:"Offset",offset_device:"Korekta",result:"Warto\u015B\u0107 w Home Assistant",result_device:"Warto\u015B\u0107 po korekcie",reference:"Odczyt wzorca",reference_hint:"Wpisz warto\u015B\u0107 z zaufanego miernika i kliknij Wylicz",apply_ref:"Wylicz",save_device:"Zapisz w czujniku",saved:"Zapisano",saved_device:"Zapisano w czujniku",limit:"Dozwolony zakres: {min} \u2026 {max}",whole_percent:"tylko pe\u0142ne procenty",devcal_busy:"\u0141\u0105cz\u0119 z czujnikiem\u2026",stored_in_sensor:"zapis w czujniku"},lock:{live:"Stan na \u017Cywo",state:"Stan",door:"Drzwi",door_open:"otwarte",door_closed:"zamkni\u0119te",calibrated:"Skalibrowany",battery:"Bateria",angle:"K\u0105t pokr\u0119t\u0142a",offline:"Zamek nieosi\u0105galny przez Bluetooth",connecting:"\u0141\u0105cz\u0119 z zamkiem\u2026",states:["zamkni\u0119ty","otwarty","zamykanie\u2026","otwieranie\u2026","zablokowany przy zamykaniu","zablokowany przy otwieraniu","zapadka","cz\u0119\u015Bciowo zamkni\u0119ty"],lock_type:"Typ zamka",type_eu:"EU",type_other:"inny",latch:"Zatrzask",latch_night:"Night Latch",latch_normal:"zwyk\u0142y",choose:"Wybierz kalibracj\u0119",experimental:"Eksperymentalne: odtworzone z kreatora w aplikacji SwitchBot. Podczas kalibracji b\u0105d\u017A przy drzwiach.",low_battery:"Niedost\u0119pne przy niskiej baterii. Wymie\u0144 albo na\u0142aduj g\u0142\xF3wn\u0105 bateri\u0119 przed kalibracj\u0105.",modes:{auto:"Kalibracja automatyczna",auto_desc:"Ustawiasz pozycj\u0119 otwart\u0105, zamkni\u0119t\u0105 zamek znajduje sam. Zalecana.",manual:"Kalibracja r\u0119czna",manual_desc:"Sam przekr\u0119casz pokr\u0119t\u0142o do pozycji zamkni\u0119tej i otwartej.",half:"Pozycja p\xF3\u0142zamkni\u0119cia",half_desc:"Ustaw pozycj\u0119 cz\u0119\u015Bciowego zamkni\u0119cia (zamki EU). Potem p\xF3\u0142zamkni\u0119cie zostanie w\u0142\u0105czone.",door:"Czujnik drzwi (magnes)",door_desc:"Naucz zamek, jak wygl\u0105daj\u0105 uchylone i zamkni\u0119te drzwi.",pro:"Kalibracja (Lock Pro)",pro_desc:"Te same kroki co w aplikacji SwitchBot: pozycja zamkni\u0119ta i otwarta, uchylone drzwi, testy.",lock1:"Kalibracja (Lock)",lock1_desc:"Te same kroki co w aplikacji SwitchBot: pozycja zamkni\u0119ta i otwarta, drzwi doci\u015Bni\u0119te do futryny, testy.",lite:"Kalibracja (Lock Lite)",lite_desc:"Te same kroki co w aplikacji SwitchBot: pozycja zamkni\u0119ta i otwarta, potem testy."},next:"Dalej",finish:"Zako\u0144cz",correct:"Poprawnie",no:"Nie",test_lock:"Testuj zamykanie",test_unlock:"Testuj otwieranie",try_again:"Spr\xF3buj ponownie",skip:"Pomi\u0144",calibrate_magnet:"Kalibruj magnes",recalibrate:"Kalibruj od nowa",check_done:"Zrobione",done_lock:"Zarygluj drzwi",starting:"Wchodzenie w tryb kalibracji\u2026",working:"Zamek si\u0119 obraca\u2026",saving:"Zapisywanie\u2026",testing_lock:"Test: zamykanie\u2026",testing_unlock:"Test: otwieranie\u2026",testing_half:"Test pozycji p\xF3\u0142zamkni\u0119cia\u2026",cancelling:"Przywracanie poprzedniej kalibracji\u2026",err_timeout:"Zamek nie zg\u0142osi\u0142 oczekiwanej pozycji na czas.",err_blocked:"Silnik jest zablokowany.",err_command:"Zamek odrzuci\u0142 polecenie albo jest nieosi\u0105galny.",step:"Krok {n} z {total}",confirm_cancel:"Przerwa\u0107 kalibracj\u0119? Zostanie przywr\xF3cona poprzednia kalibracja.",latch_night_lock:"Zamek z zatrzaskiem (Night Latch)",latch_night_desc:"Otwartych drzwi nie otworzysz z zewn\u0105trz bez klucza.",latch_one_piece:"Zamek jednocz\u0119\u015Bciowy (One-Piece)",latch_one_piece_desc:"Zamek nie ma zatrzasku albo zatrzask otwiera si\u0119 klamk\u0105 z zewn\u0105trz.",hint_unlock_first:"Najpierw otw\xF3rz: obr\xF3\u0107 pokr\u0119t\u0142o o co najmniej {deg}\xB0 od pozycji zamkni\u0119tej.",hint_no_latch:"Nie wykryto zatrzasku. Obr\xF3\u0107 pokr\u0119t\u0142o do pe\u0142nego otwarcia drzwi, potem pu\u015B\u0107 je tam, gdzie zatrzask si\u0119 wysuwa. Je\u015Bli nadal nie dzia\u0142a, sprawd\u017A monta\u017C i skalibruj od nowa.",hint_lock_first:"Zamek jest otwarty: najpierw go zamknij.",hint_lock_by_hand:"Najpierw zamknij zamek r\u0119cznie (przekr\u0119\u0107 pokr\u0119t\u0142o do pozycji zamkni\u0119tej).",hint_unlock_test:"Przed testem zamykania zamek musi by\u0107 otwarty.",hint_turn:"Obr\xF3\u0107 pokr\u0119t\u0142o o co najmniej {deg}\xB0 do pozycji p\xF3\u0142zamkni\u0119cia.",hint_turn_unlock:"Najpierw przekr\u0119\u0107 pokr\u0119t\u0142o do pozycji otwartej.",hint_lock_type:"Czekam, a\u017C zamek poda typ zamka\u2026",latch_need_key:"Nie, potrzebuj\u0119 klucza",latch_no_key:"Tak, klucz nie jest potrzebny",self_adjusting:"Zablokowany, samoregulacja\u2026",emergency_power:"W\u0142\u0105czone zasilanie awaryjne.",jam_title:"Zablokowany",jam_text:`Silnik stan\u0105\u0142, zanim dojecha\u0142 do pozycji, wi\u0119c krok nie zosta\u0142 zapisany. Sprawd\u017A:
1. Czy drzwi s\u0105 szczelnie zamkni\u0119te i nic nie blokuje zatrzasku ani rygla.
2. Czy zamek jest zamontowany zgodnie z instrukcj\u0105.
Potem skalibruj od pocz\u0105tku.`,jam_check_install:"Sprawd\u017A monta\u017C",jam_install:`Kalibracja przerwana, przywr\xF3cono poprzedni\u0105 kalibracj\u0119.
Sprawd\u017A, czy zamek siedzi prosto na pokr\u0119tle, adapter pasuje, rygiel i zatrzask chodz\u0105 swobodnie, a drzwi szczelnie si\u0119 zamykaj\u0105. Potem skalibruj od nowa.`,demo_hint:"Demo, co robisz przy drzwiach:",steps:{latch_title:"Wybierz typ zamka w drzwiach",latch_text:"Wybierz wed\u0142ug tego, jak otwieraj\u0105 si\u0119 z zewn\u0105trz drzwi, gdy zamek jest otwarty.",auto1_title:"Ustaw pozycj\u0119 otwart\u0105",auto1_text:`1. Otw\xF3rz drzwi i przytrzymaj je.
2. Upewnij si\u0119, \u017Ce zamek jest otwarty (przekr\u0119\u0107 pokr\u0119t\u0142o, a\u017C drzwi b\u0119d\u0105 otwarte), i naci\u015Bnij Dalej.
Zamek zapisze t\u0119 pozycj\u0119 i sam obr\xF3ci si\u0119 do pozycji zamkni\u0119tej. Przy otwartych drzwiach rygiel wysunie si\u0119 w powietrze, a nie w zaczep.`,auto1_nl_title:"Ustaw pozycj\u0119 otwart\u0105",auto1_nl_text:`1. Otw\xF3rz drzwi i przytrzymaj je.
2. Upewnij si\u0119, \u017Ce zamek jest otwarty, i naci\u015Bnij Dalej.
\u2460 Zatrzask pozostaje wysuni\u0119ty. \u2461 Rygiel jest schowany.
Potem zamek sam obr\xF3ci si\u0119 do pozycji zamkni\u0119tej.`,auto2_title:"Sprawd\u017A pozycj\u0119 zamkni\u0119t\u0105",auto2_text:"Sprawd\u017A, czy rygiel jest ca\u0142kowicie wysuni\u0119ty. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka.",auto2_nl_title:"Sprawd\u017A pozycj\u0119 zamkni\u0119t\u0105",auto2_nl_text:"Sprawd\u017A, czy zatrzask jest ca\u0142kowicie wysuni\u0119ty. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka.",auto3_title:"Sprawd\u017A pozycj\u0119 otwart\u0105",auto3_text:"Sprawd\u017A, czy rygiel jest schowany. Poprawnie zapisuje kalibracj\u0119.",auto3_nl_title:"Sprawd\u017A pozycj\u0119 otwart\u0105",auto3_nl_text:"Sprawd\u017A, czy \u2460 zatrzask jest ca\u0142kowicie wysuni\u0119ty, a \u2461 rygiel schowany. Poprawnie zapisuje kalibracj\u0119.",g1_title:"Przekr\u0119\u0107 do pozycji zamkni\u0119tej",g1_text:"Obr\xF3\u0107 pokr\u0119t\u0142o, a\u017C rygiel ca\u0142kowicie si\u0119 wysunie. Otw\xF3rz drzwi, \u017Ceby to sprawdzi\u0107. Potem zaznacz Zrobione i naci\u015Bnij Dalej.",g1_nl_title:"Przekr\u0119\u0107 do pozycji zamkni\u0119tej",g1_nl_text:"Obr\xF3\u0107 pokr\u0119t\u0142o, a\u017C zatrzask ca\u0142kowicie si\u0119 wysunie. Otw\xF3rz drzwi, \u017Ceby to sprawdzi\u0107. Potem zaznacz Zrobione i naci\u015Bnij Dalej.",g2_title:"Przekr\u0119\u0107 do pozycji otwartej",g2_text:"Obr\xF3\u0107 pokr\u0119t\u0142o, a\u017C rygiel si\u0119 schowa. Potem zaznacz Zrobione i naci\u015Bnij Testuj zamykanie.",g2_nl_title:"Przekr\u0119\u0107 do pozycji otwartej",g2_nl_text:"Obr\xF3\u0107 pokr\u0119t\u0142o, a\u017C \u2460 zatrzask b\u0119dzie ca\u0142kowicie wysuni\u0119ty, a \u2461 rygiel schowany. Potem zaznacz Zrobione i naci\u015Bnij Testuj zamykanie.",g3_title:"Test otwierania",g3_text:"Sprawd\u017A, czy rygiel jest ca\u0142kowicie wysuni\u0119ty. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka. Potem naci\u015Bnij Testuj otwieranie.",g3_nl_title:"Test otwierania",g3_nl_text:"Sprawd\u017A, czy rygiel jest ca\u0142kowicie wysuni\u0119ty. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka. Potem naci\u015Bnij Testuj otwieranie: zamek si\u0119 otworzy i przytrzyma zatrzask schowany przez 3 sekundy.",m1_title:"Przekr\u0119\u0107 do pozycji zamkni\u0119tej",m1_text:"Obr\xF3\u0107 pokr\u0119t\u0142o, a\u017C rygiel ca\u0142kowicie si\u0119 wysunie. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka. Potem naci\u015Bnij Dalej.",m2_title:"Przekr\u0119\u0107 do pozycji otwartej",m2_text:"Obr\xF3\u0107 pokr\u0119t\u0142o, a\u017C rygiel si\u0119 schowa, i naci\u015Bnij Testuj zamykanie. Zamek sam si\u0119 wtedy zamknie.",m2_nl_title:"Otw\xF3rz i pu\u015B\u0107 pokr\u0119t\u0142o",m2_nl_text:`1. Drzwi pozostaj\u0105 zamkni\u0119te.
2. Obr\xF3\u0107 pokr\u0119t\u0142o do pe\u0142nego otwarcia drzwi.
3. Pu\u015B\u0107 pokr\u0119t\u0142o tam, gdzie zatrzask si\u0119 wysuwa.
4. Naci\u015Bnij Testuj zamykanie.`,p1_title:"Zamknij drzwi i zamek",p1_text:`1. Zamknij drzwi.
2. Obr\xF3\u0107 pokr\u0119t\u0142o do pozycji, w kt\xF3rej zamek zamyka drzwi. Potem naci\u015Bnij Dalej.`,p2_title:"Przekr\u0119\u0107 do pozycji otwartej",p2_text:`1. Drzwi pozostaj\u0105 zamkni\u0119te.
2. Obr\xF3\u0107 pokr\u0119t\u0142o do pozycji, w kt\xF3rej zamek otwiera drzwi. Potem naci\u015Bnij Dalej.`,p2_nl_title:"Otw\xF3rz i pu\u015B\u0107 pokr\u0119t\u0142o",p2_nl_text:`1. Drzwi pozostaj\u0105 zamkni\u0119te.
2. Obr\xF3\u0107 pokr\u0119t\u0142o do pe\u0142nego otwarcia drzwi.
3. Pu\u015B\u0107 pokr\u0119t\u0142o tam, gdzie zatrzask si\u0119 wysuwa.
4. Naci\u015Bnij Dalej.`,p3_title:"Uchyl drzwi, zamknij zamek r\u0119cznie",p3_text:`1. Uchyl drzwi na ok. 10 cm od o\u015Bcie\u017Cnicy i przytrzymaj je.
2. R\u0119cznie zamknij zamek.
3. Naci\u015Bnij Dalej.`,nomagnet_pro_title:"Nie wykryto magnesu",nomagnet_pro_text:`\u2022 Nie wykryto magnesu. Autozamykanie nie b\u0119dzie dost\u0119pne.
\u2022 Otw\xF3rz drzwi, przy\u0142\xF3\u017C rygiel do o\u015Bcie\u017Cnicy i naci\u015Bnij Spr\xF3buj ponownie.
Pomi\u0144 i tak zapisze po\u0142o\u017Cenie drzwi.`,p4_title:"Test otwierania",p4_text:`1. Drzwi pozostaj\u0105 uchylone, a zamek zamkni\u0119ty.
2. Naci\u015Bnij Testuj otwieranie.`,p5_title:"Test zamykania",p5_text:`1. Zamknij drzwi. Zamek powinien by\u0107 teraz otwarty.
2. Naci\u015Bnij Testuj zamykanie.`,half1_title:"Ustaw pozycj\u0119 p\xF3\u0142zamkni\u0119cia",half1_text:`1. Otw\xF3rz drzwi.
2. Obr\xF3\u0107 pokr\u0119t\u0142o do pozycji p\xF3\u0142zamkni\u0119cia.
3. Naci\u015Bnij Dalej: zamek zapisze pozycj\u0119 i j\u0105 przetestuje.`,half2_title:"Sprawd\u017A pozycj\u0119 p\xF3\u0142zamkni\u0119cia",half2_text:"Sprawd\u017A, czy rygiel jest wysuni\u0119ty do po\u0142owy.",half_done_title:"P\xF3\u0142zamkni\u0119cie skalibrowane",half_done_text:"Pozycja jest zapisana, a p\xF3\u0142zamkni\u0119cie w\u0142\u0105czone.",door1_title:"Uchyl drzwi, zamek otwarty",door1_text:`Zamek pozostaje otwarty. Uchyl drzwi na ok. 10 cm od o\u015Bcie\u017Cnicy, przytrzymaj je i naci\u015Bnij Dalej.
Uwaga: magnes kalibruj przy zamkni\u0119tej pokrywie baterii.`,door2_title:"Zamknij drzwi",door2_text:`1. Zamek pozostaje otwarty, zamknij drzwi.
2. Naci\u015Bnij Dalej. Po kalibracji magnesu zamek sam si\u0119 zamknie.`,nomagnet_door_title:"Nie wykryto magnesu",nomagnet_door_text:`\u2022 Nie wykryto magnesu. Autozamykanie nie b\u0119dzie dost\u0119pne.
\u2022 Otw\xF3rz drzwi, przy\u0142\xF3\u017C rygiel do o\u015Bcie\u017Cnicy i naci\u015Bnij Spr\xF3buj ponownie.`,door_done_title:"Magnes skalibrowany",door_done_text:"Kalibracja zako\u0144czona powodzeniem.",done_title:"Kalibracja zako\u0144czona",done_text:"Nowa kalibracja jest aktywna.",done_magnet_title:"Kalibracja zako\u0144czona",done_magnet_text:"Nowa kalibracja jest aktywna. Magnes czujnika drzwi nie jest skalibrowany: skalibruj go teraz, \u017Ceby dzia\u0142a\u0142o autozamykanie i stan drzwi, albo pomi\u0144.",close_title:"Zamknij drzwi i zarygluj",close_text:`1. Zamek pozostaje otwarty, zamknij drzwi.
2. Naci\u015Bnij Zarygluj drzwi.`,l1_title:"Zamknij drzwi i zamek",l1_text:"Zamknij drzwi i zamknij zamek r\u0119cznie. Potem naci\u015Bnij Dalej.",l2_title:"Przekr\u0119\u0107 do pozycji otwartej",l2_text:`Przekr\u0119\u0107 pokr\u0119t\u0142o, a\u017C drzwi b\u0119d\u0105 ca\u0142kiem otwarte, i powoli je pu\u015B\u0107. Potem naci\u015Bnij Dalej.
Wskaz\xF3wka: zatrzymaj pokr\u0119t\u0142o dok\u0142adnie tam, gdzie zamek si\u0119 otwiera.`,latch1_title:"Czy drzwi maj\u0105 zatrzask?",latch1_text:"Zamek wykry\u0142 zatrzask. Czy otwarte drzwi otworzysz z zewn\u0105trz bez klucza?",l3_title:"Drzwi przy futrynie, zamknij r\u0119cznie",l3_text:"Otw\xF3rz drzwi i zamknij zamek r\u0119cznie. Doci\u015Bnij drzwi mocno do futryny i naci\u015Bnij Dalej.",l3_nl_title:"Drzwi przy futrynie, zamknij r\u0119cznie",l3_nl_text:"Otw\xF3rz drzwi i zamknij zamek r\u0119cznie. Doci\u015Bnij drzwi mocno do futryny i naci\u015Bnij Dalej.",l4_title:"Test otwierania",l4_text:"Zostaw szczelin\u0119 i naci\u015Bnij Testuj otwieranie: zamek si\u0119 otworzy.",l4_nl_title:"Test otwierania",l4_nl_text:"Drzwi musz\u0105 by\u0107 uchylone. Naci\u015Bnij Testuj otwieranie: zamek si\u0119 otworzy i przytrzyma zatrzask schowany przez 3 sekundy.",l5_title:"Test zamykania",l5_text:"Zamknij drzwi i naci\u015Bnij Testuj zamykanie.",t1_title:"Przekr\u0119\u0107 do pozycji zamkni\u0119tej",t1_text:"Przekr\u0119\u0107 pokr\u0119t\u0142o, a\u017C rygiel wysunie si\u0119 do ko\u0144ca. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka. Potem naci\u015Bnij Dalej.",t2_title:"Przekr\u0119\u0107 do pozycji otwartej",t2_text:"Przekr\u0119\u0107 pokr\u0119t\u0142o, a\u017C rygiel si\u0119 schowa. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka. Potem naci\u015Bnij Testuj zamykanie: zamek sam si\u0119 zamknie.",t3_title:"Test otwierania",t3_text:"Sprawd\u017A, czy rygiel wysun\u0105\u0142 si\u0119 do ko\u0144ca. Otw\xF3rz drzwi, \u017Ceby widzie\u0107 stan zamka. Potem naci\u015Bnij Testuj otwieranie.",t4_title:"Zamknij drzwi",t4_text:`1. Zamek pozostaje otwarty, zamknij drzwi.
2. Naci\u015Bnij Dalej. Zamek sam si\u0119 zamknie, a kalibracja zostanie zapisana.`}},history:{intro:"Wpisy zapisane przez urz\u0105dzenie, odk\u0105d Home Assistant je odczytuje (po ka\u017Cdej operacji). Starsze s\u0105 w aplikacji SwitchBot.",empty:"Brak wpis\xF3w.",no_entity:"Encja historii tego urz\u0105dzenia jest niedost\u0119pna.",days:"Ostatnie {n} dni",unknown_cred:"nieznany",lock_sources:{app:"aplikacja",widget:"wid\u017Cet",scene:"scena",nfc_tag:"tag NFC",open_api:"API",remote:"pilot",alexa:"Alexa",google:"Google",matter:"Matter",siri:"Siri",key:"klucz",keypad:"keypad",manual:"r\u0119cznie",auto_lock:"autozamykanie",force_auto_lock:"autozamykanie",emergency:"awaryjnie",unknown:""},credentials:{passcode:"kod",nfc_card:"karta",fingerprint:"odcisk",face:"twarz",palm_vein:"d\u0142o\u0144",keypad_button:"przycisk"},lock_events:{locked:"Zamkni\u0119to",lock_failed:"Zamkni\u0119cie nieudane",half_locked:"Cz\u0119\u015Bciowo zamkni\u0119to",latch_released:"Zwolniono zapadk\u0119",latch_release_failed:"Zwolnienie zapadki nieudane",unlocked:"Otwarto",unlock_failed:"Otwarcie nieudane",emergency_unlock:"Otwarcie awaryjne",door_left_open:"Drzwi zostawione otwarte",left_unlocked:"Zostawiony otwarty",low_temperature:"Niska temperatura",low_power:"S\u0142aba bateria",work_mode:"Zmiana trybu pracy"}},keypad:{battery:"Bateria",charging:"\u0142adowanie",firmware:"Firmware",on_device:"W keypadzie",on_device_value:"kody: {p}, karty: {c}",lockout:"Zablokowany po b\u0142\u0119dnych pr\xF3bach",lockout_kinds:{passcode:"kody",nfc:"karty",fingerprint:"odciski"},lift:"Odblokuj",tamper:"Alarm: keypad zdj\u0119ty z mocowania",clear:"Skasuj",duress:"Alarm przymusu",busy:"\u0141\u0105cz\u0119 z keypadem\u2026",none_yet:"Nie dodano jeszcze \u017Cadnego z Home Assistant.",add_code:"Dodaj kod",add_card:"Dodaj kart\u0119",name:"Nazwa",name_ph:"np. Go\u015B\u0107, Sprz\u0105tanie",code:"Kod (6\u201312 cyfr)",generate:"Losuj",type:"Rodzaj",types:{permanent:"Sta\u0142y",time_limited:"Czasowy",one_time:"Jednorazowy",emergency:"Awaryjny",periodic:"Cykliczny",unknown:"Nieznany"},valid_from:"Wa\u017Cny od",valid_to:"Wa\u017Cny do",days:"Dni",weekdays:["Pn","Wt","\u015Ar","Cz","Pt","So","Nd"],hours:"Godziny",always:"zawsze",confirm_delete:"Usun\u0105\u0107 \u201E{name}\u201D z keypada?",code_saved:"Kod nr {index} zapisany: {code}. Zanotuj go teraz; Home Assistant go nie przechowuje.",existing:"Nazwij kod lub kart\u0119 dodane w aplikacji SwitchBot",index:"Nr",nfc_wait:"Przy\u0142\xF3\u017C kart\u0119 do keypada\u2026",nfc_left:"zosta\u0142o {s} s",nfc_status:{success:"Karta odczytana.",failed:"Odczyt nieudany. Spr\xF3buj ponownie.",already_exists:"Ta karta jest ju\u017C dodana.",timeout:"Nie wykryto karty.",not_dedicated_card:"Ten rodzaj karty nie jest obs\u0142ugiwany."},events:{unlocked:"Otwarto",unlock_failed:"Otwarcie nieudane",verification_failed:"B\u0142\u0119dny kod / karta",expired_credential:"Niewa\u017Cny kod / karta",locked:"Zamkni\u0119to (przycisk)",lock_failed:"Zamkni\u0119cie nieudane",low_battery:"S\u0142aba bateria",locked_out:"Blokada po b\u0142\u0119dach",tamper:"Zdj\u0119ty z mocowania",doorbell:"Dzwonek",doorbell_scene:"Dzwonek \u2013 scena",unknown:"Nieznane zdarzenie"},sources:{passcode:"kod",nfc:"karta",fingerprint:"odcisk",lock_button:"przycisk",alarm:"alarm",face:"twarz",doorbell:"dzwonek",palm_vein:"d\u0142o\u0144"}},cover:{live:"Stan na \u017Cywo",connecting:"\u0141\u0105czenie\u2026",offline:"Urz\u0105dzenie niedost\u0119pne przez Bluetooth",state:"Stan",position:"Otwarcie",tilt:"Pochylenie",calibrated:"Skalibrowane",battery:"Bateria",firmware:"Oprogramowanie",mount:"Monta\u017C",mounts:{u_rail:"szyna U",i_rail:"szyna I",rod:"dr\u0105\u017Cek"},slats:"Lamele",slat:{horizontal:"poziome",vertical:"pionowe"},motion:{stopped:"zatrzymane",opening:"otwiera",closing:"zamyka",moving:"w ruchu",stuck:"zablokowane"},choose:"Kalibracja",intro:{curtain_3:"Kalibracja uczy robota, gdzie zas\u0142ona jest ca\u0142kiem otwarta i ca\u0142kiem zamkni\u0119ta. Kasuje obecn\u0105 kalibracj\u0119; do jej zako\u0144czenia zas\u0142ony nie da si\u0119 ustawi\u0107 w pozycji.",curtain_track_4:"Kalibracja uczy robota, gdzie zas\u0142ona jest ca\u0142kiem otwarta i ca\u0142kiem zamkni\u0119ta. Kasuje obecn\u0105 kalibracj\u0119; do jej zako\u0144czenia zas\u0142ony nie da si\u0119 ustawi\u0107 w pozycji.",roller_shade:"Kalibracja ustala kierunek zwijania oraz pozycje zwini\u0119t\u0105 i zamkni\u0119t\u0105. Zosta\u0144 przy oknie: pozycje ustawiasz przyciskami.",blind_tilt:"Kalibracja zapisuje cztery po\u0142o\u017Cenia lameli. Dr\u0105\u017Cek obracasz r\u0119cznie; Blind Tilt tylko zapisuje po\u0142o\u017Cenia."},experimental:"Zrobione na podstawie aplikacji SwitchBot, bez urz\u0105dzenia: kroki s\u0105 jak w aplikacji, ale kreator nie by\u0142 jeszcze sprawdzony na prawdziwym sprz\u0119cie.",err_battery:"Bateria poni\u017Cej {min}%: na\u0142aduj urz\u0105dzenie przed kalibracj\u0105.",modes:{smart:"Kalibracja automatyczna",smart_desc:"Robot sam znajduje oba ko\u0144ce szyny.",custom:"Kalibracja r\u0119czna",custom_desc:"Pozycje otwart\u0105 i zamkni\u0119t\u0105 ustawiasz przyciskami.",correction:"Smart Correction",correction_desc:"Ponownie uczy si\u0119 trasy, gdy zas\u0142ona si\u0119 rozjecha\u0142a; ostatnia kalibracja by\u0142a automatyczna.",full:"Kalibracja",full_desc:"Kierunek zwijania, pozycja zwini\u0119ta i zamkni\u0119ta.",route:"Korekta trasy",route_desc:"Ponownie uczy si\u0119 pozycji zwini\u0119tej, gdy trasa si\u0119 przesun\u0119\u0142a; ustawione pozycje zostaj\u0105.",tilt:"Kalibracja",tilt_desc:"Cztery po\u0142o\u017Cenia lameli, obracane r\u0119cznie."},step:"Krok {n} z {total}",next:"Dalej",finish:"Zako\u0144cz",done:"Gotowe",pause:"Pauza",back_to_start:"Wr\xF3\u0107 do pocz\u0105tku",confirm_cancel:"Przerwa\u0107 kalibracj\u0119? Urz\u0105dzenie wyjdzie z trybu kalibracji, a nowe dane przepadn\u0105.",starting:"Rozpoczynanie kalibracji\u2026",cancelling:"Wychodzenie z kalibracji\u2026",saving:"Zapisywanie\u2026",checking_route:"Sprawdzanie przejechanej drogi\u2026",driving_open:"Jazda do ko\u0144ca otwartego\u2026",driving_closed:"Jazda do ko\u0144ca zamkni\u0119tego\u2026",waiting_pull:"Czekam, a\u017C poci\u0105gniesz zas\u0142on\u0119\u2026",correcting:"Korekta trasy\u2026",magnet_checking:"Szukanie magnesu\u2026",rolling_up:"Zwijanie\u2026",route_rolling:"Zwijanie do korekty trasy\u2026",jog_left:"W lewo",jog_right:"W prawo",jog_up:"Zwi\u0144",jog_down:"Rozwi\u0144",demo_hint:"Demo: to, co w tym kroku robisz r\u0119cznie, zr\xF3b tym przyciskiem.",jog_hint:"Dotknij kierunku, \u017Ceby ruszy\u0107; dotknij ponownie, \u017Ceby zatrzyma\u0107.",jog_first:"Najpierw przesu\u0144 rolet\u0119 przyciskami.",blind_turn_more:"Obr\xF3\u0107 dr\u0105\u017Cek dalej: Blind Tilt odblokuje \u201EDalej\u201D, gdy zarejestruje obr\xF3t.",auto_close:"Zamknij automatycznie",logo_check:"Logo robota jest skierowane do pokoju",close_check:"Zas\u0142ona jest ca\u0142kiem zamkni\u0119ta",magnet_detect:"Wykryj magnes",magnet_skip:"Pomi\u0144",open_left:"Otwiera si\u0119 w lewo",open_right:"Otwiera si\u0119 w prawo",logo_inside:"Logo do pokoju",logo_outside:"Logo w stron\u0119 okna",start_calibration:"Rozpocznij kalibracj\u0119",recalibrate:"Kalibruj ponownie",finish_anyway:"Zako\u0144cz mimo to",roll_standard:"Zwijanie standardowe",roll_reverse:"Zwijanie odwr\xF3cone",rolled_up:"Zwini\u0119ta do ko\u0144ca",is_stuck:"Zablokowa\u0142a si\u0119",continue_route:"Kontynuuj korekt\u0119",continue_calibration:"Kontynuuj kalibracj\u0119",err_command:"Urz\u0105dzenie odrzuci\u0142o polecenie.",err_stuck:"Urz\u0105dzenie si\u0119 zatrzyma\u0142o: co\u015B je blokuje. Usu\u0144 przeszkod\u0119 i skalibruj ponownie.",err_timeout:"Urz\u0105dzenie nie sko\u0144czy\u0142o na czas. Sprawd\u017A, czy nic go nie blokuje, i skalibruj ponownie.",err_magnet:"Nie znaleziono magnesu na ko\u0144cu szyny. Umie\u015B\u0107 magnes jak w instrukcji albo pomi\u0144 ten krok.",err_wrong_way:"Dr\u0105\u017Cek obr\xF3cono w z\u0142\u0105 stron\u0119: pozycje otwarta i zamkni\u0119ta by si\u0119 nie zgadza\u0142y. Skalibruj ponownie i obracaj jak na rysunku.",err_open_below_closed:"Ustawiona pozycja zwini\u0119ta jest ni\u017Cej ni\u017C zamkni\u0119ta albo na tej samej wysoko\u015Bci. Skalibruj ponownie.",steps:{curtain:{logo_title:"Sprawd\u017A, jak wisi robot",logo_text:"Robot musi wisie\u0107 na szynie logo do pokoju. Zaznacz, gdy tak jest.",mount_title:"W kt\xF3r\u0105 stron\u0119 patrzy logo?",mount_text:"Track 4 mo\u017Cna zamontowa\u0107 w obie strony. Wybierz, gdzie patrzy logo; robot ustawi z tego kierunek silnika.",close_title:"Zamknij zas\u0142on\u0119",close_text:"Zaci\u0105gnij zas\u0142on\u0119 r\u0119cznie do ko\u0144ca, z robotem przy ko\u0144cu zamkni\u0119tym.",magnet_title:"Magnes pozycjonuj\u0105cy",magnet_text:"Z magnesem na ko\u0144cu szyny robot dok\u0142adnie odnajduje pozycj\u0119 zamkni\u0119t\u0105. Wykryj go teraz albo pomi\u0144, je\u015Bli go nie masz.",openSide_title:"W kt\xF3r\u0105 stron\u0119 otwiera si\u0119 zas\u0142ona?",openSide_text:"Wybierz stron\u0119, po kt\xF3rej zas\u0142ona si\u0119 zbiera, gdy jest otwarta.",calibrating_title:"Kalibracja",calibrating_text:"Robot jedzie do ko\u0144ca otwartego, a potem wraca do zamkni\u0119tego. Nie dotykaj zas\u0142ony.",pull_title:"Poci\u0105gnij zas\u0142on\u0119",pull_text:"Poci\u0105gnij zas\u0142on\u0119 ok. 5 cm w stron\u0119 otwierania. Robot przejmie ruch i sam znajdzie koniec otwarty.",manualOpen_title:"Ustaw pozycj\u0119 otwart\u0105",manualOpen_text:"Robot jedzie do ko\u0144ca otwartego. Popraw pozycj\u0119 strza\u0142kami, potem pozw\xF3l mu zamkn\u0105\u0107 automatycznie.",manualClose_title:"Ustaw pozycj\u0119 zamkni\u0119t\u0105",manualClose_text:"Robot wraca do ko\u0144ca zamkni\u0119tego. W razie potrzeby popraw strza\u0142kami i zako\u0144cz.",short_title:"Bardzo kr\xF3tka trasa",short_text:"Robot przejecha\u0142 mniej ni\u017C 10 cm (poni\u017Cej 16 krok\xF3w silnika). Skalibruj ponownie albo zostaw, je\u015Bli tak ma by\u0107.",fixing_title:"Smart Correction",fixing_text:"Robot przeje\u017Cd\u017Ca tras\u0119 i poprawia zapisane ko\u0144ce.",done_title:"Kalibracja zako\u0144czona",done_text:"Zas\u0142on\u0105 mo\u017Cna zn\xF3w sterowa\u0107."},roller_shade:{direction_title:"Wybierz kierunek zwijania",direction_text:"Standardowe: materia\u0142 zwisa z przodu rury (poza ram\u0105 okna). Odwr\xF3cone: z ty\u0142u (we wn\u0119ce okna, np. przy klamkach).",rollUp_title:"Zwijanie",rollUp_text:"Roleta zwija si\u0119, a\u017C silnik zatrzyma si\u0119 u g\xF3ry.",routeUp_title:"Zwijanie",routeUp_text:"Roleta zwija si\u0119, \u017Ceby ponownie nauczy\u0107 si\u0119 g\xF3rnej pozycji.",stuckSel_title:"Roleta si\u0119 zatrzyma\u0142a",stuckSel_text:"Czy jest ca\u0142kiem zwini\u0119ta, czy si\u0119 zablokowa\u0142a?",stuckHelp_title:"Roleta si\u0119 zablokowa\u0142a",stuckHelp_text:"Sprawd\u017A, czy materia\u0142 si\u0119 nie zaczepi\u0142 i nic nie blokuje dolnej listwy, potem kontynuuj.",setOpen_title:"Ustaw pozycj\u0119 zwini\u0119t\u0105",setOpen_text:"Przesu\u0144 rolet\u0119 strza\u0142kami tam, gdzie ma si\u0119 zatrzymywa\u0107 po otwarciu.",setClosed_title:"Ustaw pozycj\u0119 zamkni\u0119t\u0105",setClosed_text:"Opu\u015B\u0107 rolet\u0119 do wybranej pozycji zacienienia i zako\u0144cz.",done_title:"Kalibracja zako\u0144czona",done_text:"Rolet\u0105 mo\u017Cna zn\xF3w sterowa\u0107."},blind_tilt:{b1_title:"Ca\u0142kiem zamkni\u0119te w d\xF3\u0142",b1_text:"Obracaj dr\u0105\u017Cek, a\u017C lamele zamkn\u0105 si\u0119 ca\u0142kiem w d\xF3\u0142 (nie przekr\u0119caj ich na drug\u0105 stron\u0119). Potem dotknij \u201EDalej\u201D.",b2_title:"Ca\u0142kiem otwarte",b2_text:"Obr\xF3\u0107 dr\u0105\u017Cek z powrotem, a\u017C lamele b\u0119d\u0105 ca\u0142kiem otwarte (poziomo). Potem dotknij \u201EDalej\u201D.",b3_title:"Ca\u0142kiem zamkni\u0119te w g\xF3r\u0119",b3_text:"Obracaj dalej, a\u017C lamele zamkn\u0105 si\u0119 ca\u0142kiem w g\xF3r\u0119. Potem dotknij \u201EDalej\u201D.",b4_title:"Zn\xF3w ca\u0142kiem otwarte",b4_text:"Obr\xF3\u0107 z powrotem do pe\u0142nego otwarcia. Liczba obrot\xF3w do \u201Eotwartych\u201D r\xF3\u017Cni si\u0119 od g\xF3ry i od do\u0142u, dlatego zapisuje si\u0119 j\u0105 dwa razy.",done_title:"Kalibracja zako\u0144czona",b1v_title:"Ca\u0142kiem zamkni\u0119te w lewo",b1v_text:"Obracaj dr\u0105\u017Cek, a\u017C lamele zamkn\u0105 si\u0119 ca\u0142kiem w lewo (nie przekr\u0119caj ich na drug\u0105 stron\u0119). Potem dotknij \u201EDalej\u201D.",b2v_title:"Ca\u0142kiem otwarte",b2v_text:"Obr\xF3\u0107 dr\u0105\u017Cek z powrotem, a\u017C lamele b\u0119d\u0105 ca\u0142kiem otwarte (prostopadle do okna). Potem dotknij \u201EDalej\u201D.",b3v_title:"Ca\u0142kiem zamkni\u0119te w prawo",b3v_text:"Obracaj dalej, a\u017C lamele zamkn\u0105 si\u0119 ca\u0142kiem w prawo. Potem dotknij \u201EDalej\u201D.",b4v_title:"Zn\xF3w ca\u0142kiem otwarte",b4v_text:"Obr\xF3\u0107 z powrotem do pe\u0142nego otwarcia. Liczba obrot\xF3w do \u201Eotwartych\u201D r\xF3\u017Cni si\u0119 z ka\u017Cdej strony, dlatego zapisuje si\u0119 j\u0105 dwa razy.",done_text:"Blind Tilt zna ju\u017C po\u0142o\u017Cenia lameli."}}}};var V3={en:e2,pl:H3};function r5(H){return(H?.locale?.language||H?.language||"en").startsWith("pl")?"pl":"en"}function r2(H,V){return V.split(".").reduce((C,L)=>C?.[L],H)}function L3(H){let V=V3[r5(H)];return(C,L={})=>{let e=r2(V,C)??r2(e2,C);if(typeof e!="string")return C;for(let[r,t]of Object.entries(L))e=e.replace(`{${r}}`,String(t));return e}}function E1(H,V){let C=V3[r5(H)];return r2(C,V)??r2(e2,V)}function Q7(H){return r5(H)==="pl"?"pl-PL":"en-GB"}function j1(H,V){return V?new Date(V).toLocaleString(Q7(H),{dateStyle:"short",timeStyle:"short"}):""}var S=class extends z{get t(){return(!this._t||this._tHass!==this.hass)&&(this._tHass=this.hass,this._t=L3(this.hass)),this._t}};l([c({attribute:!1})],S.prototype,"hass",2);function b(H){return H&&typeof H=="object"&&"message"in H?String(H.message):String(H)}function N1(H,V,C){H.dispatchEvent(new CustomEvent(V,{detail:C,bubbles:!0,composed:!0}))}function e3(H,V){N1(H,"sb-navigate",{path:V})}function t2(H,V){return H==null||Number.isNaN(H)?"\u2014":Number(H).toFixed(V)}function h(H){return V=>{customElements.get(H)||customElements.define(H,V)}}var r3="M11,9A4,4 0 0,1 15,13A4,4 0 0,1 11,17A4,4 0 0,1 7,13A4,4 0 0,1 11,9M11,11A2,2 0 0,0 9,13A2,2 0 0,0 11,15A2,2 0 0,0 13,13A2,2 0 0,0 11,11M7,4H14A4,4 0 0,1 18,8V9H16V8A2,2 0 0,0 14,6H7A2,2 0 0,0 5,8V20H16V18H18V22H3V8A4,4 0 0,1 7,4M16,11C18.5,11 18.5,9 21,9V11C18.5,11 18.5,13 16,13V11M16,15C18.5,15 18.5,13 21,13V15C18.5,15 18.5,17 16,17V15Z";var t3="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z";var g1="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z";var F="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16";var M3="M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z";var i3="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";var o3="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z";var a3="M7.5,5.6L5,7L6.4,4.5L5,2L7.5,3.4L10,2L8.6,4.5L10,7L7.5,5.6M19.5,15.4L22,14L20.6,16.5L22,19L19.5,17.6L17,19L18.4,16.5L17,14L19.5,15.4M22,2L20.6,4.5L22,7L19.5,5.6L17,7L18.4,4.5L17,2L19.5,3.4L22,2M13.34,12.78L15.78,10.34L13.66,8.22L11.22,10.66L13.34,12.78M14.37,7.29L16.71,9.63C17.1,10 17.1,10.65 16.71,11.04L5.04,22.71C4.65,23.1 4,23.1 3.63,22.71L1.29,20.37C0.9,20 0.9,19.35 1.29,18.96L12.96,7.29C13.35,6.9 14,6.9 14.37,7.29Z";var n3="M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z";var A3="M13 14H11V8H13M13 18H11V16H13M16.7 4H15V2H9V4H7.3C6.6 4 6 4.6 6 5.3V20.6C6 21.4 6.6 22 7.3 22H16.6C17.3 22 17.9 21.4 17.9 20.7V5.3C18 4.6 17.4 4 16.7 4Z";var d3="M14 20H6V6H14M14.67 4H13V2H7V4H5.33C4.6 4 4 4.6 4 5.33V20.67C4 21.4 4.6 22 5.33 22H14.67C15.4 22 16 21.4 16 20.67V5.33C16 4.6 15.4 4 14.67 4M21 7H19V13H21V8M21 15H19V17H21V15Z";var l3="M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M14,21A2,2 0 0,1 12,23A2,2 0 0,1 10,21";var s3="M20 19V3H4V19H2V21H22V19H20M16 9H18V11H16V9M14 11H6V9H14V11M18 7H16V5H18V7M14 5V7H6V5H14M6 19V13H14V14.82C13.55 15.14 13.25 15.66 13.25 16.25C13.25 17.22 14.03 18 15 18S16.75 17.22 16.75 16.25C16.75 15.66 16.45 15.13 16 14.82V13H18V19H6Z";var p3="M14.88,16.29L13,18.17V14.41M13,5.83L14.88,7.71L13,9.58M17.71,7.71L12,2H11V9.58L6.41,5L5,6.41L10.59,12L5,17.58L6.41,19L11,14.41V22H12L17.71,16.29L13.41,12L17.71,7.71Z";var m3="M22,3H2C0.91,3.04 0.04,3.91 0,5V19C0.04,20.09 0.91,20.96 2,21H22C23.09,20.96 23.96,20.09 24,19V5C23.96,3.91 23.09,3.04 22,3M22,19H2V5H22V19M14,17V15.75C14,14.09 10.66,13.25 9,13.25C7.34,13.25 4,14.09 4,15.75V17H14M9,7A2.5,2.5 0 0,0 6.5,9.5A2.5,2.5 0 0,0 9,12A2.5,2.5 0 0,0 11.5,9.5A2.5,2.5 0 0,0 9,7M14,7V8H20V7H14M14,9V10H20V9H14M14,11V12H18V11H14";var c3="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z";var v3="M20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.76,4 13.5,4.11 14.2,4.31L15.77,2.74C14.61,2.26 13.34,2 12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z";var k1="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z";var x3="M6,4H18V5H21V7H18V9H21V11H18V13H21V15H18V17H21V19H18V20H6V19H3V17H6V15H3V13H6V11H3V9H6V7H3V5H6V4M11,15V18H12V15H11M13,15V18H14V15H13M15,15V18H16V15H15Z";var u3="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z";var Z3="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z";var M2="M23 3H1V1H23V3M2 22H6C6 19 4 17 4 17C10 13 11 4 11 4H2V22M22 4H13C13 4 14 13 20 17C20 17 18 19 18 22H22V4Z";var h3="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z";var i2="M12,19A2,2 0 0,0 10,21A2,2 0 0,0 12,23A2,2 0 0,0 14,21A2,2 0 0,0 12,19M6,1A2,2 0 0,0 4,3A2,2 0 0,0 6,5A2,2 0 0,0 8,3A2,2 0 0,0 6,1M6,7A2,2 0 0,0 4,9A2,2 0 0,0 6,11A2,2 0 0,0 8,9A2,2 0 0,0 6,7M6,13A2,2 0 0,0 4,15A2,2 0 0,0 6,17A2,2 0 0,0 8,15A2,2 0 0,0 6,13M18,5A2,2 0 0,0 20,3A2,2 0 0,0 18,1A2,2 0 0,0 16,3A2,2 0 0,0 18,5M12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17A2,2 0 0,0 14,15A2,2 0 0,0 12,13M18,13A2,2 0 0,0 16,15A2,2 0 0,0 18,17A2,2 0 0,0 20,15A2,2 0 0,0 18,13M18,7A2,2 0 0,0 16,9A2,2 0 0,0 18,11A2,2 0 0,0 20,9A2,2 0 0,0 18,7M12,7A2,2 0 0,0 10,9A2,2 0 0,0 12,11A2,2 0 0,0 14,9A2,2 0 0,0 12,7M12,1A2,2 0 0,0 10,3A2,2 0 0,0 12,5A2,2 0 0,0 14,3A2,2 0 0,0 12,1Z";var S3="M14 8C13.45 8 13 7.55 13 7S13.45 6 14 6C14.55 6 15 6.45 15 7C15 7.55 14.55 8 14 8M12 12V19H5V12H12M12.78 10H4.22C3.55 10 3 10.55 3 11.22V19.78C3 20.45 3.55 21 4.22 21H12.78C13.45 21 14 20.45 14 19.78V11.22C14 10.55 13.45 10 12.78 10M19.78 3H11.22C10.55 3 10 3.55 10 4.22V8H12V5H19V12H16V14H19.78C20.45 14 21 13.45 21 12.78V4.22C21 3.55 20.45 3 19.78 3M17 8C16.45 8 16 7.55 16 7S16.45 6 17 6C17.55 6 18 6.45 18 7C18 7.55 17.55 8 17 8M17 11C16.45 11 16 10.55 16 10S16.45 9 17 9C17.55 9 18 9.45 18 10C18 10.55 17.55 11 17 11M7 15C6.45 15 6 14.55 6 14S6.45 13 7 13C7.55 13 8 13.45 8 14C8 14.55 7.55 15 7 15M10 18C9.45 18 9 17.55 9 17S9.45 16 10 16C10.55 16 11 16.45 11 17C11 17.55 10.55 18 10 18";var f3="M16 11H18V13H16V11M12 3H19A2 2 0 0 1 21 5V19H22V21H2V19H10V5A2 2 0 0 1 12 3M12 5V19H19V5M6.2 5H2.8V4.5A1.7 1.7 0 0 1 6.2 4.5M7 5V4.5A2.5 2.5 0 0 0 2 4.5V5A1 1 0 0 0 1 6V10A1 1 0 0 0 2 11H7A1 1 0 0 0 8 10V6A1 1 0 0 0 7 5",g3="M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z";var k3="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z";var o2="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z";var t5="M6,22A3,3 0 0,1 3,19C3,18.4 3.18,17.84 3.5,17.37L9,7.81V6A1,1 0 0,1 8,5V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V5A1,1 0 0,1 15,6V7.81L20.5,17.37C20.82,17.84 21,18.4 21,19A3,3 0 0,1 18,22H6M5,19A1,1 0 0,0 6,20H18A1,1 0 0,0 19,19C19,18.79 18.93,18.59 18.82,18.43L16.53,14.47L14,17L8.93,11.93L5.18,18.43C5.07,18.59 5,18.79 5,19M13,10A1,1 0 0,0 12,11A1,1 0 0,0 13,12A1,1 0 0,0 14,11A1,1 0 0,0 13,10Z";var _3="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H17.5C16.95,22 16,21.55 16,21C16,21.55 15.05,22 14.5,22H12V20H14A1,1 0 0,0 15,19V5A1,1 0 0,0 14,4H12V2H14.5C15.05,2 16,2.45 16,3C16,2.45 16.95,2 17.5,2H20V4H18A1,1 0 0,0 17,5V7M2,7H13V9H4V15H13V17H2V7M20,15V9H17V15H20M8.5,12A1.5,1.5 0 0,0 7,10.5A1.5,1.5 0 0,0 5.5,12A1.5,1.5 0 0,0 7,13.5A1.5,1.5 0 0,0 8.5,12M13,10.89C12.39,10.33 11.44,10.38 10.88,11C10.32,11.6 10.37,12.55 11,13.11C11.55,13.63 12.43,13.63 13,13.11V10.89Z";var y3="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z";var b3="M19,20H17V11H7V20H5V9L12,5L19,9V20M8,12H16V14H8V12M8,15H16V17H8V15M16,18V20H8V18H16Z";var w3="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.4 19,16.5 17.3,18C15.9,16.7 14,16 12,16C10,16 8.2,16.7 6.7,18C5,16.5 4,14.4 4,12A8,8 0 0,1 12,4M14,5.89C13.62,5.9 13.26,6.15 13.1,6.54L11.81,9.77L11.71,10C11,10.13 10.41,10.6 10.14,11.26C9.73,12.29 10.23,13.45 11.26,13.86C12.29,14.27 13.45,13.77 13.86,12.74C14.12,12.08 14,11.32 13.57,10.76L13.67,10.5L14.96,7.29L14.97,7.26C15.17,6.75 14.92,6.17 14.41,5.96C14.28,5.91 14.15,5.89 14,5.89M10,6A1,1 0 0,0 9,7A1,1 0 0,0 10,8A1,1 0 0,0 11,7A1,1 0 0,0 10,6M7,9A1,1 0 0,0 6,10A1,1 0 0,0 7,11A1,1 0 0,0 8,10A1,1 0 0,0 7,9M17,9A1,1 0 0,0 16,10A1,1 0 0,0 17,11A1,1 0 0,0 18,10A1,1 0 0,0 17,9Z";var O3="M13 5C15.21 5 17 6.79 17 9C17 10.5 16.2 11.77 15 12.46V11.24C15.61 10.69 16 9.89 16 9C16 7.34 14.66 6 13 6S10 7.34 10 9C10 9.89 10.39 10.69 11 11.24V12.46C9.8 11.77 9 10.5 9 9C9 6.79 10.79 5 13 5M20 20.5C19.97 21.32 19.32 21.97 18.5 22H13C12.62 22 12.26 21.85 12 21.57L8 17.37L8.74 16.6C8.93 16.39 9.2 16.28 9.5 16.28H9.7L12 18V9C12 8.45 12.45 8 13 8S14 8.45 14 9V13.47L15.21 13.6L19.15 15.79C19.68 16.03 20 16.56 20 17.14V20.5M20 2H4C2.9 2 2 2.9 2 4V12C2 13.11 2.9 14 4 14H8V12L4 12L4 4H20L20 12H18V14H20V13.96L20.04 14C21.13 14 22 13.09 22 12V4C22 2.9 21.11 2 20 2Z";var $3="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3";var T3="M15 13L11 17V14H2V12H11V9L15 13M5 20V16H7V18H17V10.19L12 5.69L7.21 10H4.22L12 3L22 12H19V20H5Z";var a2="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z";var P3="M2.81,8.46L14.83,20.5L15.54,19.78L16.95,21.19L18.36,19.78L16.95,18.36L18.36,16.95L19.78,18.36L21.19,16.95L19.78,15.54L20.5,14.83L8.46,2.81L2.81,8.46M5.64,8.46L8.46,5.64L17.66,14.83L14.83,17.66L5.64,8.46M7.05,8.46L8.46,9.88L9.88,8.46L8.46,7.05L7.05,8.46M9.17,10.59L10.59,12L12,10.59L10.59,9.17L9.17,10.59M11.29,12.71L12.71,14.12L14.12,12.71L12.71,11.29L11.29,12.71M13.41,14.83L14.83,16.24L16.24,14.83L14.83,13.41L13.41,14.83Z";var n2="M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z";var A2="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z";var B3="M10 17C8.9 17 8 16.1 8 15C8 13.9 8.9 13 10 13C11.1 13 12 13.9 12 15S11.1 17 10 17M16 20V10H4V20H16M16 8C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H4C2.9 22 2 21.1 2 20V10C2 8.9 2.9 8 4 8H5V6C5 3.2 7.2 1 10 1S15 3.2 15 6V8H16M10 3C8.3 3 7 4.3 7 6V8H13V6C13 4.3 11.7 3 10 3M22 7H20V13H22V7M22 15H20V17H22V15Z";var z3="M19 13C19.34 13 19.67 13.04 20 13.09V10C20 8.9 19.11 8 18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.89 4 10V20C4 21.11 4.89 22 6 22H13.81C13.3 21.12 13 20.1 13 19C13 15.69 15.69 13 19 13M9 6C9 4.34 10.34 3 12 3S15 4.34 15 6V8H9V6M12 17C10.9 17 10 16.11 10 15S10.9 13 12 13C13.1 13 14 13.89 14 15C14 16.11 13.11 17 12 17M23 18V20H15V18H23Z";var R3="M10 13C11.1 13 12 13.89 12 15C12 16.11 11.11 17 10 17S8 16.11 8 15 8.9 13 10 13M18 1C15.24 1 13 3.24 13 6V8H4C2.9 8 2 8.9 2 10V20C2 21.1 2.9 22 4 22H16C17.1 22 18 21.1 18 20V10C18 8.9 17.1 8 16 8H15V6C15 4.34 16.34 3 18 3S21 4.34 21 6V8H23V6C23 3.24 20.76 1 18 1M16 10V20H4V10H16Z",F3="M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10C4,8.89 4.89,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z";var d2="M19,13H5V11H19V13Z";var D3="M5,7A2,2 0 0,0 3,9V15A2,2 0 0,0 5,17H8V15H5V9H8V7H5M11,7A2,2 0 0,0 9,9V15A2,2 0 0,0 11,17H13A2,2 0 0,0 15,15V9A2,2 0 0,0 13,7H11M11,9H13V15H11V9M16,10.5V12H19V13.5H17.5A1.5,1.5 0 0,0 16,15V18H20.5V16.5H17.5V15H19A1.5,1.5 0 0,0 20.5,13.5V12A1.5,1.5 0 0,0 19,10.5H16Z";var E3="M10,0.2C9,0.2 8.2,1 8.2,2C8.2,3 9,3.8 10,3.8C11,3.8 11.8,3 11.8,2C11.8,1 11,0.2 10,0.2M15.67,1A7.33,7.33 0 0,0 23,8.33V7A6,6 0 0,1 17,1H15.67M18.33,1C18.33,3.58 20.42,5.67 23,5.67V4.33C21.16,4.33 19.67,2.84 19.67,1H18.33M21,1A2,2 0 0,0 23,3V1H21M7.92,4.03C7.75,4.03 7.58,4.06 7.42,4.11L2,5.8V11H3.8V7.33L5.91,6.67L2,22H3.8L6.67,13.89L9,17V22H10.8V15.59L8.31,11.05L9.04,8.18L10.12,10H15V8.2H11.38L9.38,4.87C9.08,4.37 8.54,4.03 7.92,4.03Z";var j3="M4,17V9H2V7H6V17H4M22,15C22,16.11 21.1,17 20,17H16V15H20V13H18V11H20V9H16V7H20A2,2 0 0,1 22,9V10.5A1.5,1.5 0 0,1 20.5,12A1.5,1.5 0 0,1 22,13.5V15M14,15V17H8V13C8,11.89 8.9,11 10,11H12V9H8V7H12A2,2 0 0,1 14,9V11C14,12.11 13.1,13 12,13H10V15H14Z";var N3="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z";var W3="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z";var I3="M8,5.14V19.14L19,12.14L8,5.14Z";var _1="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z";var U3="M7.5,10.5A1.5,1.5 0 0,1 9,12A1.5,1.5 0 0,1 7.5,13.5C6.66,13.5 6,12.83 6,12A1.5,1.5 0 0,1 7.5,10.5M16.5,10.5A1.5,1.5 0 0,1 18,12A1.5,1.5 0 0,1 16.5,13.5A1.5,1.5 0 0,1 15,12A1.5,1.5 0 0,1 16.5,10.5M4.22,2H19.78C21,2 22,3 22,4.22V19.78A2.22,2.22 0 0,1 19.78,22H4.22C3,22 2,21 2,19.78V4.22A2.22,2.22 0 0,1 4.22,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z";var K3="M7.95,3L6.53,5.19L7.95,7.4H7.94L5.95,10.5L4.22,9.6L5.64,7.39L4.22,5.19L6.22,2.09L7.95,3M13.95,2.89L12.53,5.1L13.95,7.3L13.94,7.31L11.95,10.4L10.22,9.5L11.64,7.3L10.22,5.1L12.22,2L13.95,2.89M20,2.89L18.56,5.1L20,7.3V7.31L18,10.4L16.25,9.5L17.67,7.3L16.25,5.1L18.25,2L20,2.89M2,22V14A2,2 0 0,1 4,12H20A2,2 0 0,1 22,14V22H20V20H4V22H2M6,14A1,1 0 0,0 5,15V17A1,1 0 0,0 6,18A1,1 0 0,0 7,17V15A1,1 0 0,0 6,14M10,14A1,1 0 0,0 9,15V17A1,1 0 0,0 10,18A1,1 0 0,0 11,17V15A1,1 0 0,0 10,14M14,14A1,1 0 0,0 13,15V17A1,1 0 0,0 14,18A1,1 0 0,0 15,17V15A1,1 0 0,0 14,14M18,14A1,1 0 0,0 17,15V17A1,1 0 0,0 18,18A1,1 0 0,0 19,17V15A1,1 0 0,0 18,14Z";var l2="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z";var G3="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z";var s2="M12,2C14.65,2 17.19,3.06 19.07,4.93L17.65,6.35C16.15,4.85 14.12,4 12,4C9.88,4 7.84,4.84 6.35,6.35L4.93,4.93C6.81,3.06 9.35,2 12,2M3.66,6.5L5.11,7.94C4.39,9.17 4,10.57 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,10.57 19.61,9.17 18.88,7.94L20.34,6.5C21.42,8.12 22,10.04 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12C2,10.04 2.58,8.12 3.66,6.5M12,6A6,6 0 0,1 18,12C18,13.59 17.37,15.12 16.24,16.24L14.83,14.83C14.08,15.58 13.06,16 12,16C10.94,16 9.92,15.58 9.17,14.83L7.76,16.24C6.63,15.12 6,13.59 6,12A6,6 0 0,1 12,6M12,8A1,1 0 0,0 11,9A1,1 0 0,0 12,10A1,1 0 0,0 13,9A1,1 0 0,0 12,8Z";var Q3="M20 19V3H4V19H2V21H22V19H20M6 19V13H11V14.8C10.6 15.1 10.2 15.6 10.2 16.2C10.2 17.2 11 18 12 18S13.8 17.2 13.8 16.2C13.8 15.6 13.5 15.1 13 14.8V13H18V19H6Z";var W1="M16.89,15.5L18.31,16.89C19.21,15.73 19.76,14.39 19.93,13H17.91C17.77,13.87 17.43,14.72 16.89,15.5M13,17.9V19.92C14.39,19.75 15.74,19.21 16.9,18.31L15.46,16.87C14.71,17.41 13.87,17.76 13,17.9M19.93,11C19.76,9.61 19.21,8.27 18.31,7.11L16.89,8.53C17.43,9.28 17.77,10.13 17.91,11M15.55,5.55L11,1V4.07C7.06,4.56 4,7.92 4,12C4,16.08 7.05,19.44 11,19.93V17.91C8.16,17.43 6,14.97 6,12C6,9.03 8.16,6.57 11,6.09V10L15.55,5.55Z";var q3="M21,11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1L21,5V11M12,21C15.75,20 19,15.54 19,11.22V6.3L12,3.18L5,6.3V11.22C5,15.54 8.25,20 12,21M11,7H13V13H11V7M11,15H13V17H11V15Z";var Y3="M18,18H6V6H18V18Z";var p2="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z";var X3="M16.95,16.95L14.83,14.83C15.55,14.1 16,13.1 16,12C16,11.26 15.79,10.57 15.43,10L17.6,7.81C18.5,9 19,10.43 19,12C19,13.93 18.22,15.68 16.95,16.95M12,5C13.57,5 15,5.5 16.19,6.4L14,8.56C13.43,8.21 12.74,8 12,8A4,4 0 0,0 8,12C8,13.1 8.45,14.1 9.17,14.83L7.05,16.95C5.78,15.68 5,13.93 5,12A7,7 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z";var m2="M17 6H7C3.69 6 1 8.69 1 12S3.69 18 7 18H17C20.31 18 23 15.31 23 12S20.31 6 17 6M17 16H7C4.79 16 3 14.21 3 12S4.79 8 7 8H17C19.21 8 21 9.79 21 12S19.21 16 17 16M17 9C15.34 9 14 10.34 14 12S15.34 15 17 15 20 13.66 20 12 18.66 9 17 9Z";var J3="M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z",C0="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z";var H0="M10 3.25C10 3.25 16 10 16 14C16 17.31 13.31 20 10 20S4 17.31 4 14C4 10 10 3.25 10 3.25M20 7V13H18V7H20M18 17H20V15H18V17Z";var y1="M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z";var f="ha_switchbot_ble",V0=H=>H.callWS({type:`${f}/panel/devices`}),L0=(H,V)=>H.connection.subscribeMessage(V,{type:`${f}/sensors/subscribe`}),e0=(H,V,C,L)=>H.callWS({type:`${f}/sensors/set_offset`,entry_id:V,key:C,offset:L}),r0=(H,V,C)=>H.callWS({type:`${f}/sensors/device_calibration`,entry_id:V,...C}),t0=(H,V,C)=>H.connection.subscribeMessage(C,{type:`${f}/calibration/subscribe`,entry_id:V}),M5=(H,V,C,L={})=>H.callWS({type:`${f}/calibration/action`,entry_id:V,action:C,...L}),M0=(H,V,C)=>H.connection.subscribeMessage(C,{type:`${f}/covers/subscribe`,entry_id:V}),i5=(H,V,C)=>H.callWS({type:`${f}/covers/action`,entry_id:V,...C});async function i0(H,V,C=14){let L=new Date(Date.now()-C*864e5).toISOString();return((await H.callWS({type:"history/history_during_period",start_time:L,entity_ids:[V],minimal_response:!1,no_attributes:!1,significant_changes_only:!1}))[V]||[]).filter(t=>t.a?.event_type&&t.s!=="unavailable"&&t.s!=="unknown").map(t=>({time:t.a.time||new Date(t.lu*1e3).toISOString(),type:t.a.event_type,source:t.a.source,credential:t.a.credential,credential_id:t.a.credential_id,credential_name:t.a.credential_name,unknown_credential:t.a.unknown_credential})).reverse()}var o0=(H,V)=>H.connection.subscribeMessage(V,{type:`${f}/keypad/subscribe`});async function a0(H,V,C,L={}){return H.callWS({type:`${f}/keypad/op`,entry_id:V,op:C,data:L})}function Q(H){H?.then(V=>V()).catch(()=>{})}var q7={correction:!1,device_calibration:!1,lock_calibration:!1,half_lock:!1,auto_calibration:!1,keypad:!1,cover_calibration:!0},d0=[["c3u","Curtain 3 U rail","curtain_3",{mount_type:"u_rail"}],["c3i","Curtain 3 I rail","curtain_3",{mount_type:"i_rail"}],["c3rod","Curtain 3 Rod Type","curtain_3",{mount_type:"rod",firmware:2.1,new_auto:!1}],["t4solar","Curtain Track 4 solar","curtain_track_4",{mount_type:"u_rail",solar_panel:!0}],["t4bat","Curtain Track 4 Extended Battery","curtain_track_4",{mount_type:"u_rail",extended_battery_installed:!0}],["t4pair","Curtain Track 4 L+R","curtain_track_4",{mount_type:"u_rail",chain_length:2}],["roller","Roller Shade","roller_shade",{roll_direction:"standard"}],["blindh","Blind Tilt horizontal","blind_tilt",{slat_direction:"horizontal"}],["blindv","Blind Tilt vertical","blind_tilt",{slat_direction:"vertical"}]],l0=d0.map(([H,V,C],L)=>({entry_id:`demo_${H}`,device_id:`demo-${H}`,name:`${V} (demo)`,model:C,address:`DE:MO:00:00:02:${String(L).padStart(2,"0")}`,available:!0,kind:"cover",features:q7})),l1={},q,o5={device_class:"battery",unit_of_measurement:"%"},a5={device_class:"problem"},c2=H=>({device_class:"enum",options:H}),n0={not_charging:["Not charging","Nie \u0142aduje"],adapter_charging:["Charging (adapter)","\u0141adowanie (zasilacz)"],solar_charging:["Charging (solar panel)","\u0141adowanie (panel s\u0142oneczny)"],solar_full:["Full (solar panel)","Na\u0142adowana (panel s\u0142oneczny)"],solar_idle:["Solar panel, not charging","Panel s\u0142oneczny, bez \u0142adowania"]},n5={performance:["Performance","Wydajny"],quietdrift:["QuietDrift","QuietDrift"],silent:["Silent","Cichy"],quiet:["Quiet","Cichy"]},Y7={performance:5,silent:2.5,quiet:2.5,quietdrift:1};function s0(H){q=H,d0.forEach(([V,,C,L])=>{let e=`demo-${V}`,r=`${V}_demo`,t=C==="blind_tilt",a={available:!0,battery:70,firmware:C==="curtain_3"?2.2:1.8,calibration:!0,position:t?null:60,tilt:t?50:null,motion:"stopped",motion_status:"stopped",move_state:"stopped",stuck:!1,new_auto:C!=="roller_shade"&&C!=="blind_tilt",last_calibration_auto:!0,...L};l1[`demo_${V}`]={entry:`demo_${V}`,device:e,slug:r,model:C,st:a,scenarios:new Set,subs:new Set,started:!1};let M=H.entity;t?M(`cover.${r}`,e,"","open",{supported_features:240,current_tilt_position:50,device_class:"blind"}):M(`cover.${r}`,e,"","open",{supported_features:15,current_position:60,device_class:C==="roller_shade"?"shade":"curtain"}),M(`sensor.${r}_battery`,e,["Battery","Bateria"],"70",o5,"diagnostic"),M(`binary_sensor.${r}_calibration`,e,["Calibration","Kalibracja"],"on",{},"diagnostic"),M(`sensor.${r}_charge_status`,e,["Charging state","Stan \u0142adowania"],L.solar_panel?"solar_charging":"not_charging",c2(Object.keys(n0)),"diagnostic",n0),M(`binary_sensor.${r}_battery_charging`,e,["Charging","\u0141adowanie"],L.solar_panel?"on":"off",{device_class:"battery_charging"},"diagnostic"),M(`binary_sensor.${r}_solar_panel`,e,["Solar panel","Panel s\u0142oneczny"],L.solar_panel?"on":"off",{device_class:"plug"},"diagnostic"),M(`button.${r}_refresh_settings`,e,["Refresh settings","Od\u015Bwie\u017C ustawienia"],"unknown",{},"diagnostic"),(C==="curtain_3"||C==="curtain_track_4")&&(M(`select.${r}_motion_mode`,e,["Default motion mode","Domy\u015Blny tryb ruchu"],"performance",{options:["performance","quietdrift","silent"]},"config",n5),M(`switch.${r}_touch_and_go`,e,"Touch & Go","on",{},"config"),M(`binary_sensor.${r}_high_temperature`,e,["High temperature","Wysoka temperatura"],"off",{device_class:"heat"},"diagnostic"),M(`binary_sensor.${r}_low_temperature`,e,["Low temperature","Niska temperatura"],"off",{device_class:"cold"},"diagnostic"),M(`binary_sensor.${r}_overheating`,e,["Overheating","Przegrzanie"],"off",{device_class:"heat"},"diagnostic"),M(`sensor.${r}_mount_type`,e,["Mount","Monta\u017C"],String(L.mount_type),c2(["u_rail","rod","i_rail"]),"diagnostic",{u_rail:["U rail","Szyna U"],rod:["Rod","Dr\u0105\u017Cek"],i_rail:["I rail","Szyna I"]}),C==="curtain_3"&&M(`binary_sensor.${r}_magnet_alarm`,e,["Positioning magnet alarm","Alarm magnesu pozycjonuj\u0105cego"],"off",a5,"diagnostic"),C==="curtain_track_4"&&(M(`sensor.${r}_builtin_battery`,e,["Built-in battery","Bateria wbudowana"],"80",o5,"diagnostic"),L.extended_battery_installed&&(M(`sensor.${r}_extended_battery`,e,["Extended Battery","Dodatkowa bateria"],"66",o5,"diagnostic"),q.setEntity(`sensor.${r}_battery`,"70")),M(`binary_sensor.${r}_extended_battery_installed`,e,["Extended Battery installed","Dodatkowa bateria za\u0142o\u017Cona"],L.extended_battery_installed?"on":"off",{device_class:"plug"},"diagnostic"),L.chain_length&&M(`sensor.${r}_chain_length`,e,["Linked devices","Po\u0142\u0105czone urz\u0105dzenia"],"2",{},"diagnostic"))),C==="roller_shade"&&(M(`select.${r}_motor_mode`,e,["Motor mode","Tryb silnika"],"performance",{options:["performance","quietdrift"]},"config",n5),M(`binary_sensor.${r}_stuck`,e,["Stuck","Zablokowanie"],"off",a5),M(`sensor.${r}_light_level`,e,["Light level","Poziom \u015Bwiat\u0142a"],"6",{}),M(`sensor.${r}_roll_direction`,e,["Rolling direction","Kierunek zwijania"],"standard",c2(["standard","reverse"]),"diagnostic",{standard:["Standard roll","Standardowy"],reverse:["Reverse roll","Odwr\xF3cony"]}),M(`sensor.${r}_motor_stop_reason`,e,["Motor stop reason","Przyczyna zatrzymania silnika"],"target_reached",{},"diagnostic",{target_reached:["Target reached","Osi\u0105gni\u0119to cel"],stuck:["Stalled","Zablokowanie"],command:["Stop command","Polecenie zatrzymania"]}),M(`button.${r}_locate`,e,["Locate","Zlokalizuj"],"unknown"),M(`button.${r}_toggle`,e,["Toggle (open / stop / close)","Prze\u0142\u0105cz (otw\xF3rz / stop / zamknij)"],"unknown")),t&&(M(`select.${r}_motor_mode`,e,["Motor mode","Tryb silnika"],"performance",{options:["performance","quiet"]},"config",n5),M(`binary_sensor.${r}_stuck`,e,["Stuck","Zablokowanie"],"off",a5),M(`sensor.${r}_slat_direction`,e,["Slat direction","Uk\u0142ad lameli"],String(L.slat_direction),c2(["horizontal","vertical"]),"diagnostic",{horizontal:["Horizontal slats","Lamele poziome"],vertical:["Vertical slats","Lamele pionowe"]}))})}var X7=H=>Object.values(l1).find(V=>H.startsWith(`cover.${V.slug}`)||H.startsWith(`button.${V.slug}`)),p0=H=>H.model==="blind_tilt"?"tilt":"position";function A5(H){for(let V of H.subs)V({status:{...H.st},started:H.started})}function L1(H){let V=H.st[p0(H)]??0,L=H.st.motion==="opening"||H.st.motion==="closing"?H.st.motion:H.model==="blind_tilt"?V<20||V>80?"closed":"open":V===0?"closed":"open";q.setEntity(`cover.${H.slug}`,L,H.model==="blind_tilt"?{current_tilt_position:V}:{current_position:V}),q.setEntity(`binary_sensor.${H.slug}_calibration`,H.st.calibration?"on":"off"),q.setEntity(`sensor.${H.slug}_battery`,String(H.st.battery)),(H.model==="roller_shade"||H.model==="blind_tilt")&&q.setEntity(`binary_sensor.${H.slug}_stuck`,H.st.stuck?"on":"off"),H.model==="roller_shade"&&H.st.motor_stop_reason&&q.setEntity(`sensor.${H.slug}_motor_stop_reason`,H.st.motor_stop_reason),A5(H)}function m0(H,V){H.st.motion=V,H.st.motion_status=V,H.st.move_state=V==="stopped"?H.st.stuck?"stuck":"stopped":"moving"}function Y(H,V="command"){clearInterval(H.timer),H.timer=void 0,m0(H,"stopped"),H.st.motor_stop_reason=V,L1(H)}function w(H,V,C,L){clearInterval(H.timer);let e=p0(H),r=H.st[e]??0;if(r===V)return L?.();H.st.stuck=!1;let t=e==="tilt"?Math.abs(V-50)<Math.abs(r-50):V>r;m0(H,t?"opening":"closing");let a=(r+V)/2;H.timer=window.setInterval(()=>{let M=H.st[e]??0;if((H.scenarios.has("block")||H.scenarios.has("timeout"))&&Math.abs(M-a)<C){if(H.scenarios.has("timeout")||H.model.startsWith("curtain")){L1(H);return}H.st.stuck=!0,Y(H,"stuck");return}let A=M+Math.sign(V-M)*Math.min(C,Math.abs(V-M));H.st[e]=Math.round(A*10)/10,H.st[e]===V?(Y(H,H.model==="roller_shade"&&V===100?"fully_open":"target_reached"),L?.()):L1(H)},200),L1(H)}function A0(H,V){let C=V&&V!=="default"?V:q.getEntity(`select.${H.slug}_motion_mode`)?.state??q.getEntity(`select.${H.slug}_motor_mode`)?.state??"performance";return Y7[C]??5}function c0(H,V,C){let L=X7(String(C.entity_id));if(!L)return!1;if(H==="button")return C.entity_id.endsWith("_locate")?w(L,Math.max(0,(L.st.position??0)-5),2,()=>w(L,(L.st.position??0)+5,2)):C.entity_id.endsWith("_toggle")&&(L.timer?Y(L):w(L,(L.st.position??0)>50?0:100,A0(L))),!0;if(!L.st.calibration&&!V.startsWith("stop"))return!0;let e=A0(L,C.speed);return V.startsWith("stop")?Y(L):V==="open_cover"?w(L,100,e):V==="close_cover"?w(L,0,e):V==="set_cover_position"?w(L,Number(C.position),e):V==="open_cover_tilt"?w(L,50,e):V==="close_cover_tilt"?w(L,(L.st.tilt??0)>50?100:0,e):V==="set_cover_tilt_position"&&w(L,Number(C.tilt_position),e),!0}function v0(H,V){let C=l1[H];if(!C)return null;C.subs.add(V),setTimeout(()=>A5(C),10);let L=window.setInterval(()=>V({status:{...C.st},started:C.started}),1e3);return()=>{clearInterval(L),C.subs.delete(V),!C.subs.size&&C.started&&x0(C)}}function x0(H){Y(H),H.awaitPull=void 0,H.started=!1,H.model==="blind_tilt"&&Object.assign(H.st,{calibration_next:!1,calibration_wrong_way:!1}),A5(H)}var d1=4;function u0(H){let V=l1[H.entry_id];if(!V)throw new Error("Device not found");let C=(r,t=!0)=>(L1(V),{success:t,result:r,status:{...V.st}});if(H.read){if(H.read==="distance"){let r=V.scenarios.has("short");return V.st.calibration_distance={distance_cm:r?6:180,steps:r?10:260,route_too_short:r},C(V.st.calibration_distance)}return H.read==="magnet"?(V.st.magnet_detected=!V.scenarios.has("nomagnet"),C({magnet_detected:V.st.magnet_detected})):H.read==="last_auto"?C({last_calibration_auto:V.st.last_calibration_auto}):C(V.st)}let L=String(H.action),e=H.value;switch(L){case"abort":return x0(V),C();case"finished":return V.started=!1,V.st.calibration=!0,C();case"poll":return C()}return(L.startsWith("start")||L==="smart_correction"||L==="route_start")&&(V.started=!0,L!=="route_start"&&L!=="smart_correction"&&(V.st.calibration=!1)),V.model==="blind_tilt"?V4(V,L,e,C):V.model==="roller_shade"?C4(V,L,C):J7(V,L,C)}function J7(H,V,C){switch(V){case"start_new_auto":H.model==="curtain_track_4"?w(H,100,d1):H.awaitPull="open";break;case"smart_correction":H.awaitPull="correction";break;case"drive_open":H.awaitPull||w(H,100,d1);break;case"drive_closed":w(H,0,d1);break;case"jog_left":w(H,100,1.5);break;case"jog_right":w(H,0,1.5);break;case"pause":Y(H);break;case"exit":Y(H),H.started=!1,H.st.calibration=!0;break;case"magnet_on":case"magnet_off":case"open_side":case"mount_side":case"start_auto":case"start_manual":break;default:throw new Error(`ValueError: ${V} is not a calibration step`)}return C()}function C4(H,V,C){switch(V){case"start":case"record_top":case"record_open":case"record_closed":break;case"to_top":case"route_start":H.route=V==="route_start",w(H,100,d1);break;case"jog_up":w(H,100,1.5);break;case"jog_down":w(H,0,1.5);break;case"pause":case"stop":Y(H);break;case"complete":if(H.scenarios.has("short"))return C(void 0,!1);H.started=!1,H.st.calibration=!0;break;case"route_confirm":H.started=!1,H.st.calibration=!0;break;case"exit":Y(H),H.started=!1;break;default:throw new Error(`ValueError: ${V} is not a calibration step`)}return C()}var H4={0:0,1:50,2:100,3:50};function V4(H,V,C,L){switch(V){case"start":Object.assign(H.st,{calibration_step:0,calibration_next:!1,calibration_exited:!1,calibration_wrong_way:!1});break;case"save":{if(![1,2,3,5].includes(C??-1))throw new Error("ValueError: save needs one of (1, 2, 3, 5)");H.st.calibration_step=C===5?4:C,H.st.calibration_next=!1;break}case"exit":H.started=!1,H.st.calibration=!0,Object.assign(H.st,{calibration_exited:!0,calibration_next:!1,calibration_wrong_way:!1});break;default:throw new Error(`ValueError: ${V} is not a calibration step`)}return L()}function d5(H){let V=H?l1[H]:void 0;return V?V.model==="blind_tilt"?["turn","wrong_way","block","lowbatt"]:V.model==="roller_shade"?["block","timeout","short","lowbatt"]:["pull","block","timeout","short",...V.model==="curtain_3"?["nomagnet"]:[],"lowbatt"]:[]}function Z0(H,V){return!!l1[H]?.scenarios.has(V)}function v2(H,V){let C=l1[H];if(C){if(V==="pull"){let L=C.awaitPull;C.awaitPull=void 0,L==="correction"?w(C,100,d1,()=>w(C,0,d1)):w(C,100,d1);return}if(V==="turn"){let L=C.st.calibration_step??0;w(C,H4[L]??50,4,()=>{C.started&&(C.st.calibration_next=!0),L1(C)});return}if(V==="wrong_way"){C.st.calibration_wrong_way=!0,L1(C);return}C.scenarios.has(V)?C.scenarios.delete(V):C.scenarios.add(V),V==="lowbatt"&&(C.st.battery=C.scenarios.has("lowbatt")?7:70),V==="block"&&!C.scenarios.has("block")&&(C.st.stuck=!1),L1(C)}}var u2=new Set(["Lock Ultra","Lock Ultra Max"]),h0=new Set(["WoLock","Lock Lite"]),s5=[{id:"lock",slug:"lock_ultra_demo",name:"Lock Ultra",model:"Lock Ultra",euro:!0,magnetUncalibrated:!0},{id:"lock_nl",slug:"lock_ultra_nl_demo",name:"Lock Ultra EU Night Latch",model:"Lock Ultra",euro:!0,nightLatch:!0},{id:"lock_op",slug:"lock_ultra_op_demo",name:"Lock Ultra EU One-Piece",model:"Lock Ultra",euro:!0,nightLatch:!1},{id:"lock_us",slug:"lock_ultra_us_demo",name:"Lock Ultra non-EU",model:"Lock Ultra",euro:!1},{id:"lockpro",slug:"lock_pro_demo",name:"Lock Pro",model:"WoLockPro",euro:!0},{id:"ultramax",slug:"lock_ultra_max_demo",name:"Lock Ultra Max",model:"Lock Ultra Max",euro:!0},{id:"lock1",slug:"lock_gen1_demo",name:"Lock",model:"WoLock",euro:!1,latchType:1},{id:"lock1_nl",slug:"lock_gen1_nl_demo",name:"Lock Night Latch",model:"WoLock",euro:!1,latchType:2},{id:"lite",slug:"lock_lite_demo",name:"Lock Lite",model:"Lock Lite",euro:!1,latchType:1}],L4={correction:!1,device_calibration:!1,lock_calibration:!0,half_lock:!1,auto_calibration:!0,keypad:!1},S0=s5.map((H,V)=>({entry_id:`demo_${H.id}`,device_id:`demo-${H.id}`,name:`${H.name} (demo)`,model:H.model,model_name:{WoLock:"Lock",WoLockPro:"Lock Pro"}[H.model]??H.model,address:`DE:MO:00:00:03:${String(V).padStart(2,"0")}`,available:!0,kind:"lock",features:{...L4,half_lock:u2.has(H.model)&&H.euro,auto_calibration:u2.has(H.model),...H.nightLatch!==void 0?{night_latch:H.nightLatch}:{}}})),f0=s5.map(H=>[`demo-${H.id}`,H.slug,H.model]),p5={},x2;function g0(H){x2=H;for(let V of s5){let C=u2.has(V.model),L=h0.has(V.model)?{available:!0,lock_state:0,knob_angle:110,calibration:!0,battery:87,latch_type:V.latchType??0,self_adjusting:!1,...V.model==="WoLock"?{door_open:!1}:{}}:{available:!0,lock_state:0,knob_angle:110,door_open:!1,calibration:!0,battery:87,lock_type:V.euro?1:0,latch_state:V.euro?1:0,magnetic_position_alarm:!!V.magnetUncalibrated,rotation_direction:0,...C?{battery_status:0,auto_calibration_done:!0,half_lock_calibration_done:!1,half_lock_enabled:!1}:{}};p5[`demo_${V.id}`]={def:V,st:L,subs:new Set,started:!1,halfMode:!1,scenarios:new Set,unlockAngle:20}}}var s1=H=>p5[H];function Z2(H){for(let V of H.subs)V({status:{...H.st},started:H.started})}function P(H,V){Object.assign(H.st,V),Z2(H),(V.lock_state===0||V.lock_state===1)&&x2.setEntity(`lock.${H.def.slug}`,V.lock_state===0?"locked":"unlocked"),V.door_open!==void 0&&x2.setEntity(`binary_sensor.${H.def.slug}_door`,V.door_open?"on":"off"),V.battery!==void 0&&x2.setEntity(`sensor.${H.def.slug}_battery`,String(V.battery))}function l5(H,V,C,L,e,r){clearInterval(H.timer);let t=H.st.knob_angle??0,a=Date.now();P(H,L),H.timer=window.setInterval(()=>{let M=Math.min(1,(Date.now()-a)/C);P(H,{knob_angle:Math.round(t+(V-t)*M)}),M>=1&&(clearInterval(H.timer),P(H,e),r?.())},150)}function e1(H,V,C,L={},e){if(H.scenarios.has("timeout")&&(H.started||H.halfMode))return;let r=V===1?3:2;if(H.scenarios.has("block")&&(H.started||H.halfMode)){let t=Math.round(((H.st.knob_angle??0)+C)/2);l5(H,t,1200/2,{lock_state:r},{lock_state:V===1?5:4});return}l5(H,C,1200,{lock_state:r},{lock_state:V,...L},e)}var e4=new Set(["half_lock_set_and_test","half_lock_start","half_lock_complete","half_lock_enable"]),r4=window.sbDemoLockActions=[];function m5(H){r4.push({...H});let V=s1(H.entry_id);if(!V)throw new Error("demo: unknown lock");let C=H.action;if(e4.has(C)&&V.st.lock_type!==1)throw new Error("ValueError: half lock needs an EU lock");let L=u2.has(V.def.model);switch(C){case"start":V.started=!0,L&&(V.st.auto_calibration_done=!1);break;case"notify":case"notify_off":case"set_latch_type":case"refresh":case"set_latch":case"set_lock_position":case"set_lock_position_door_closed":case"set_door_closed":break;case"set_unlock_position":case"set_unlock_position_door_open":case"set_latch_position":V.unlockAngle=V.st.knob_angle??20;break;case"set_door_open":V.st.magnetic_position_alarm=V.scenarios.has("nomagnet");break;case"auto_record_unlocked":V.unlockAngle=V.st.knob_angle??20,V.st.auto_calibration_done=!1,e1(V,0,110,{lock_state:4},()=>P(V,{auto_calibration_done:!0,lock_state:0}));break;case"auto_record_locked":V.st.auto_calibration_done=!1,e1(V,1,V.unlockAngle,{lock_state:5},()=>P(V,{auto_calibration_done:!0,lock_state:1}));break;case"test_lock":case"lock":e1(V,0,110);break;case"test_unlock":case"unlock":e1(V,1,V.unlockAngle);break;case"complete":V.started=!1,V.st.calibration=!0;break;case"recover":V.started=!1;break;case"leave":V.started=!1,V.halfMode=!1,clearInterval(V.timer);break;case"half_lock_start":V.halfMode=!0,V.started=!0;break;case"half_lock_set_and_test":V.st.half_lock_calibration_done=!1,e1(V,7,65,{},()=>P(V,{half_lock_calibration_done:!0}));break;case"half_lock_complete":V.halfMode=!1,V.started=!1;break;case"half_lock_enable":V.st.half_lock_enabled=!0;break;default:throw new Error(`demo: unknown action ${C}`)}return Z2(V),{success:!0,status:{...V.st}}}function k0(H,V){let C=s1(H);return C?(C.subs.add(V),setTimeout(()=>Z2(C),10),()=>{C.subs.delete(V),!C.subs.size&&C.started&&m5({entry_id:H,action:"leave"})}):null}function _0(H,V){let C=Object.values(p5).find(L=>`lock.${L.def.slug}`===H);return C?(V==="lock"?e1(C,0,110):e1(C,1,C.unlockAngle),!0):!1}function y0(){let H=s1("demo_lock");H&&e1(H,1,H.unlockAngle)}function h2(H,V){let C=s1(H);if(!C)return;let L=C.st.lock_type===1,e=(r,t)=>l5(C,r,600,{},t);switch(V){case"knob":P(C,{knob_angle:(C.st.knob_angle??0)+20});break;case"door":P(C,{door_open:!C.st.door_open});break;case"turn_locked":case"lock_manual":e(110,{lock_state:0,latch_state:L?1:0});break;case"turn_unlocked":e(20,{lock_state:1,latch_state:L?1:0});break;case"release_latch":e(0,{lock_state:1}),window.setTimeout(()=>e(20,{lock_state:1,latch_state:L?2:0}),700);break;case"turn_half":e(Math.abs((C.st.knob_angle??0)-65)<10?80:65,{lock_state:1});break;case"door_ajar":case"door_against":P(C,{door_open:!0});break;case"door_close":P(C,{door_open:!1});break}}function b0(H){let V=H?s1(H):void 0;return V?h0.has(V.def.model)?["block","timeout"]:V.def.model==="WoLockPro"?["block","nomagnet","timeout"]:["block","nomagnet","lowbatt","timeout"]:[]}function w0(H,V){return!!s1(H)?.scenarios.has(V)}function O0(H,V){let C=s1(H);if(!C)return;C.scenarios.has(V)?C.scenarios.delete(V):C.scenarios.add(V);let L=C.scenarios.has(V);V==="lowbatt"?P(C,{battery:L?8:87,battery_status:L?1:0}):V==="nomagnet"?P(C,{magnetic_position_alarm:L||!!C.def.magnetUncalibrated}):V==="block"&&!L&&C.st.lock_state!==null&&C.st.lock_state>=4?P(C,{lock_state:1}):Z2(C)}var $0=864e5,O=H=>new Date(H).toISOString(),v5=new Set,t4=()=>v5.forEach(H=>H());function B0(H){return v5.add(H),()=>v5.delete(H)}var b1={correction:!1,device_calibration:!1,lock_calibration:!1,half_lock:!1,auto_calibration:!0,keypad:!1},M4={keypad:"Keypad",plug_mini_eu:"Plug Mini (EU)",garage_door_opener:"Garage Door Opener",bulb:"Color Bulb",strip_light_3:"Strip Light 3",bot:"Bot",relay_switch_1pm:"Relay Switch 1PM",evaporative_humidifier:"Evaporative Humidifier",circulator_fan:"Circulator Fan",standing_fan:"Standing Fan",circulator_fan_pro:"Circulator Fan Pro",air_purifier_us:"Air Purifier US",air_purifier_table_us:"Air Purifier Table US",k10_pro_vacuum:"K10+ Pro Vacuum",contact:"Contact Sensor",motion_sensor:"Motion Sensor",leak:"Water Leak Detector",presence_sensor:"Presence Sensor",smart_thermostat_radiator:"Smart Radiator Thermostat",hub2:"Hub 2",indoor_outdoor_thermo_hygrometer:"Indoor/Outdoor Thermo-Hygrometer",meter_pro_co2:"Meter Pro CO2",curtain_3:"Curtain 3",curtain_track_4:"Curtain Track 4",roller_shade:"Roller Shade",blind_tilt:"Blind Tilt"},z0=[...S0,{entry_id:"demo_keypad",device_id:"demo-keypad",name:"Keypad (demo)",model:"keypad",address:"DE:MO:00:00:00:03",available:!0,kind:"keypad",features:{...b1,keypad:!0}},{entry_id:"demo_plug",device_id:"demo-plug",name:"Plug Mini (demo)",model:"plug_mini_eu",address:"DE:MO:00:00:00:04",available:!0,kind:"plug",features:b1},...[["garage","Garage Door Opener","garage_door_opener","switch"],["bulb","Color Bulb","bulb","light"],["strip","Strip Light 3","strip_light_3","light"],["bot","Bot","bot","switch"],["relay","Relay Switch 1PM","relay_switch_1pm","switch"],["humidifier","Evaporative Humidifier","evaporative_humidifier","appliance"],["fan","Battery Circulator Fan","circulator_fan","appliance"],["standingfan","Standing Circulator Fan","standing_fan","appliance"],["fanpro","Battery Circulator Fan 2 Pro","circulator_fan_pro","appliance"],["purifier","Air Purifier","air_purifier_us","appliance"],["purifiertable","Air Purifier Table","air_purifier_table_us","appliance"],["vacuum","K10+ Pro Vacuum","k10_pro_vacuum","appliance"],["contact","Contact Sensor","contact","sensor"],["motion","Motion Sensor","motion_sensor","sensor"],["leak","Water Leak Detector","leak","sensor"],["presence","Presence Sensor","presence_sensor","sensor"],["trv","Smart Radiator Thermostat","smart_thermostat_radiator","appliance"]].map(([H,V,C,L],e)=>({entry_id:`demo_${H}`,device_id:`demo-${H}`,name:`${V} (demo)`,model:C,address:`DE:MO:00:00:01:${String(e).padStart(2,"0")}`,available:!0,kind:L,features:b1})),...l0,{entry_id:"demo_hub2",device_id:"demo-hub2",name:"Hub 2 (demo)",model:"hub2",address:"DE:MO:00:00:00:08",available:!0,kind:"sensor",features:{...b1,correction:!0}},{entry_id:"demo_thermo",device_id:"demo-thermo",name:"Thermo-Hygrometer (demo)",model:"indoor_outdoor_thermo_hygrometer",address:"DE:MO:00:00:00:05",available:!0,kind:"sensor",features:{...b1,correction:!0,device_calibration:!0}},{entry_id:"demo_co2",device_id:"demo-co2",name:"Meter Pro CO2 (demo)",model:"meter_pro_co2",address:"DE:MO:00:00:00:06",available:!0,kind:"sensor",features:{...b1,correction:!0}}].map(H=>({...H,model_name:H.model_name??M4[H.model]})),R0={temperature:[-10,10],humidity:[-20,20],co2:[-500,500]},x5=!1,F0=H=>typeof H=="string"?H:H[x5?1:0],U1=O(Date.now()),r1={};function o(H,V,C,L,e={},r=null,t){r1[H]={device:V,name:C,category:r,state:L,attributes:e,labels:t}}var i4={min:0,max:4,step:1,mode:"slider"};for(let[H,V,C]of f0)o(`lock.${V}`,H,"","locked"),o(`sensor.${V}_battery`,H,["Battery","Bateria"],"87",{device_class:"battery",unit_of_measurement:"%"}),C!=="Lock Lite"&&o(`binary_sensor.${V}_door`,H,["Door","Drzwi"],"off",{device_class:"door"}),!(C==="WoLock"||C==="Lock Lite")&&(o(`event.${V}_history`,H,["History","Historia"],U1,{event_type:"locked",event_types:["locked","unlocked"]}),o(`switch.${V}_led`,H,["LED","Dioda LED"],"on",{},"config"),o(`switch.${V}_sound`,H,["Sound","D\u017Awi\u0119k"],"on",{},"config"),o(`switch.${V}_auto_lock`,H,["Auto-lock","Autozamykanie"],"on",{},"config"),o(`number.${V}_auto_lock_delay`,H,["Auto-lock delay","Op\xF3\u017Anienie autozamykania"],"30",{min:0,max:3659,step:1,mode:"box",unit_of_measurement:"s"},"config"),o(`sensor.${V}_firmware`,H,"Firmware","1.4",{},"diagnostic"));o("select.lock_ultra_demo_motor_speed","demo-lock",["Motor speed","Pr\u0119dko\u015B\u0107 silnika"],"standard",{options:["standard","gentle","fast"]},"config",{standard:["Standard","Standardowa"],gentle:["Gentle","\u0141agodna"],fast:["Fast","Szybka"]});o("number.lock_ultra_demo_beep_volume","demo-lock",["Beep volume","G\u0142o\u015Bno\u015B\u0107 sygna\u0142\xF3w"],"2",i4,"config");o("sensor.keypad_demo_battery","demo-keypad",["Battery","Bateria"],"76",{device_class:"battery",unit_of_measurement:"%"});o("event.keypad_demo_keypad_history","demo-keypad",["History","Historia"],U1,{event_type:"unlocked",event_types:["unlocked","locked"]});o("switch.keypad_demo_keypad_enabled","demo-keypad",["Keypad enabled","Klawiatura w\u0142\u0105czona"],"on",{},"config");o("switch.keypad_demo_tamper_alarm_enabled","demo-keypad",["Tamper alarm","Alarm sabota\u017Cu"],"on",{},"config");o("switch.keypad_demo_sound_enabled","demo-keypad",["Sound","D\u017Awi\u0119k"],"on",{},"config");o("select.keypad_demo_backlight_mode","demo-keypad",["Backlight","Pod\u015Bwietlenie"],"auto",{options:["off","auto","on"]},"config",{off:["Off","Wy\u0142\u0105czone"],auto:["Auto","Automatyczne"],on:["On","W\u0142\u0105czone"]});o("select.keypad_demo_lock_button_mode","demo-keypad",["Lock button","Przycisk zamykania"],"timed",{options:["off","always","timed"]},"config",{off:["Off","Wy\u0142\u0105czony"],always:["Always","Zawsze"],timed:["Timed","Czasowo"]});o("number.keypad_demo_lock_button_time","demo-keypad",["Lock button time","Czas przycisku zamykania"],"30",{min:1,max:600,step:1,mode:"box",unit_of_measurement:"s"},"config");o("button.keypad_demo_sync_time","demo-keypad",["Set clock","Ustaw zegar"],U1,{},"config");o("switch.plug_mini_demo","demo-plug","","on");o("sensor.plug_mini_demo_power","demo-plug",["Power","Moc"],"41.2",{device_class:"power",unit_of_measurement:"W"});o("sensor.plug_mini_demo_voltage","demo-plug",["Voltage","Napi\u0119cie"],"231",{device_class:"voltage",unit_of_measurement:"V"});o("sensor.plug_mini_demo_current","demo-plug",["Current","Pr\u0105d"],"0.2",{device_class:"current",unit_of_measurement:"A"});o("sensor.plug_mini_demo_energy","demo-plug",["Energy","Energia"],"12.47",{device_class:"energy",unit_of_measurement:"kWh",state_class:"total_increasing"});o("switch.plug_mini_demo_led","demo-plug",["LED","Dioda LED"],"on",{},"config");o("select.plug_mini_demo_power_on_state","demo-plug",["Power-on state","Stan po zaniku zasilania"],"last_state",{options:["off","on","last_state"]},"config",{off:["Off","Wy\u0142\u0105czone"],on:["On","W\u0142\u0105czone"],last_state:["Last state","Ostatni stan"]});var N={device_class:"battery",unit_of_measurement:"%"},D0={min:0,max:4,step:1,mode:"slider"};o("number.lock_ultra_max_demo_voice_volume","demo-ultramax",["Voice volume","G\u0142o\u015Bno\u015B\u0107 g\u0142osu"],"3",D0,"config");o("number.lock_ultra_max_demo_beep_volume","demo-ultramax",["Beep volume","G\u0142o\u015Bno\u015B\u0107 sygna\u0142\xF3w"],"2",D0,"config");o("select.lock_ultra_max_demo_voice_language","demo-ultramax",["Voice language","J\u0119zyk komunikat\xF3w"],"english",{options:["german","english","french","italian"]},"config",{german:["German","Niemiecki"],english:["English","Angielski"],french:["French","Francuski"],italian:["Italian","W\u0142oski"]});o("select.lock_ultra_max_demo_weather","demo-ultramax",["Weather announcement","Zapowied\u017A pogody"],"scheduled",{options:["always","scheduled","off"]},"config",{always:["Always","Zawsze"],scheduled:["Scheduled","W wybranych godzinach"],off:["Off","Wy\u0142\u0105czona"]});g0({setEntity:(H,V,C)=>g(H,V,C)});s0({entity:o,setEntity:(H,V,C)=>g(H,V,C),getEntity:H=>r1[H]});o("cover.garage_demo","demo-garage","","closed",{supported_features:3,device_class:"garage"});o("light.bulb_demo","demo-bulb","","on",{brightness:180,color_mode:"rgb",supported_color_modes:["rgb"]});o("light.strip_demo","demo-strip","","off",{color_mode:"rgb",supported_color_modes:["rgb"]});o("switch.bot_demo","demo-bot","","off");o("sensor.bot_demo_battery","demo-bot",["Battery","Bateria"],"95",N);o("switch.relay_demo","demo-relay","","on");o("sensor.relay_demo_power","demo-relay",["Power","Moc"],"1240",{device_class:"power",unit_of_measurement:"W"});o("sensor.relay_demo_voltage","demo-relay",["Voltage","Napi\u0119cie"],"229",{device_class:"voltage",unit_of_measurement:"V"});o("sensor.relay_demo_current","demo-relay",["Current","Pr\u0105d"],"5.4",{device_class:"current",unit_of_measurement:"A"});o("sensor.relay_demo_energy","demo-relay",["Energy","Energia"],"87.1",{device_class:"energy",unit_of_measurement:"kWh"});a4();o("vacuum.vacuum_demo","demo-vacuum","","docked",{battery_level:100});o("sensor.vacuum_demo_battery","demo-vacuum",["Battery","Bateria"],"100",N);o("binary_sensor.contact_demo","demo-contact",["Door","Drzwi"],"off",{device_class:"door"});o("binary_sensor.contact_demo_motion","demo-contact",["Motion","Ruch"],"off",{device_class:"motion"});o("sensor.contact_demo_battery","demo-contact",["Battery","Bateria"],"88",N);o("binary_sensor.motion_demo","demo-motion",["Motion","Ruch"],"on",{device_class:"motion"});o("binary_sensor.motion_demo_light","demo-motion",["Light","\u015Awiat\u0142o"],"on",{device_class:"light"});o("sensor.motion_demo_battery","demo-motion",["Battery","Bateria"],"67",N);o("binary_sensor.leak_demo","demo-leak",["Leak","Wyciek"],"off",{device_class:"moisture"});o("sensor.leak_demo_battery","demo-leak",["Battery","Bateria"],"90",N);o4();o("sensor.hub2_demo_temperature","demo-hub2",["Temperature","Temperatura"],"21.9",{device_class:"temperature",unit_of_measurement:"\xB0C"});o("sensor.hub2_demo_humidity","demo-hub2",["Humidity","Wilgotno\u015B\u0107"],"44",{device_class:"humidity",unit_of_measurement:"%"});o("sensor.hub2_demo_light","demo-hub2",["Light level","Poziom \u015Bwiat\u0142a"],"12",{});var E0={device_class:"temperature",unit_of_measurement:"\xB0C",state_class:"measurement"},j0={device_class:"humidity",unit_of_measurement:"%",state_class:"measurement"};o("sensor.thermo_demo_temperature","demo-thermo",["Temperature","Temperatura"],"21.6",E0);o("sensor.thermo_demo_humidity","demo-thermo",["Humidity","Wilgotno\u015B\u0107"],"47",j0);o("sensor.thermo_demo_battery","demo-thermo",["Battery","Bateria"],"64",{device_class:"battery",unit_of_measurement:"%"});o("sensor.co2_demo_temperature","demo-co2",["Temperature","Temperatura"],"22.3",E0);o("sensor.co2_demo_humidity","demo-co2",["Humidity","Wilgotno\u015B\u0107"],"41",j0);o("sensor.co2_demo_co2","demo-co2","CO\u2082","820",{device_class:"carbon_dioxide",unit_of_measurement:"ppm"});o("sensor.co2_demo_battery","demo-co2",["Battery","Bateria"],"92",{device_class:"battery",unit_of_measurement:"%"});function o4(){let H={device_class:"problem"};o("sensor.motion_demo_distance","demo-motion",["Detection distance","Zasi\u0119g wykrywania"],"medium",{device_class:"enum",options:["long","medium","short"]},"diagnostic",{long:["Long (8 m)","Daleki (8 m)"],medium:["Medium (4 m)","\u015Aredni (4 m)"],short:["Short (2 m)","Bliski (2 m)"]}),o("binary_sensor.motion_demo_led","demo-motion",["Indicator light","Lampka wska\u017Anika"],"on",{device_class:"light"},"diagnostic");let V="demo-presence";o("binary_sensor.presence_demo",V,["Occupancy","Obecno\u015B\u0107"],"on",{device_class:"occupancy"}),o("sensor.presence_demo_light",V,["Light level","Poziom \u015Bwiat\u0142a"],"9",{state_class:"measurement"}),o("sensor.presence_demo_battery",V,["Battery","Bateria"],"81",N),o("binary_sensor.presence_demo_adaptive",V,["Auto-adjusted","Autokalibracja wykonana"],"on",{},"diagnostic"),o("binary_sensor.presence_demo_led",V,["Indicator light","Lampka wska\u017Anika"],"on",{device_class:"light"},"diagnostic");let C="demo-leak";o("binary_sensor.leak_demo_alarm",C,["Alarm","Alarm"],"off",H),o("binary_sensor.leak_demo_buzzer",C,["Buzzer","Brz\u0119czyk"],"off",{device_class:"sound"}),o("sensor.leak_demo_alarm_mode",C,["Alarm mode","Tryb alarmu"],"leak",{device_class:"enum",options:["leak","dry"]},null,{leak:["Leak alert","Alarm zalania"],dry:["Dry alert","Alarm sucho\u015Bci"]}),o("sensor.leak_demo_volume",C,["Alarm volume","G\u0142o\u015Bno\u015B\u0107 alarmu"],"low",{device_class:"enum",options:["quiet","low","medium","high"]},"diagnostic",{quiet:["Quiet","Cichy"],low:["Low","Niska"],medium:["Medium","\u015Arednia"],high:["High","Wysoka"]}),o("sensor.leak_demo_duration",C,["Alarm duration","Czas trwania alarmu"],"60",{device_class:"duration",unit_of_measurement:"s"},"diagnostic"),o("sensor.leak_demo_interval",C,["Alarm interval","Odst\u0119p alarm\xF3w"],"5",{device_class:"duration",unit_of_measurement:"min"},"diagnostic"),o("binary_sensor.leak_demo_wifi",C,["Wi-Fi fault","B\u0142\u0105d Wi-Fi"],"off",H,"diagnostic");let L="demo-trv",e={unit_of_measurement:"\xB0C",mode:"box"};o("climate.trv_demo",L,"","heat",{hvac_modes:["heat","off"],hvac_action:"heating",current_temperature:20.5,temperature:22,min_temp:10,max_temp:25,target_temp_step:.5,preset_mode:"comfort",preset_modes:["schedule","manual","off","eco","comfort","boost"]}),o("binary_sensor.trv_demo_valve",L,["Valve","Zaw\xF3r"],"on",{device_class:"opening"}),o("binary_sensor.trv_demo_window",L,["Window open","Okno otwarte"],"off",{device_class:"window"}),o("sensor.trv_demo_temperature",L,["Temperature","Temperatura"],"20.5",{device_class:"temperature",unit_of_measurement:"\xB0C"}),o("sensor.trv_demo_battery",L,["Battery","Bateria"],"74",N),o("binary_sensor.trv_demo_fault",L,["Fault","Usterka"],"off",H,"diagnostic"),o("sensor.trv_demo_fast_heat_remaining",L,["Fast heating remaining","Pozosta\u0142y czas szybkiego grzania"],"0",{device_class:"duration",unit_of_measurement:"min"},"diagnostic"),o("switch.trv_demo_child_lock",L,["Child lock","Blokada rodzicielska"],"off",{},"config"),o("switch.trv_demo_window_detection",L,["Open window detection","Wykrywanie otwartego okna"],"on",{},"config"),o("switch.trv_demo_anti_frost",L,["Anti-frost","Ochrona przed zamarzaniem"],"on",{},"config"),o("switch.trv_demo_descaling",L,["Descaling","Odkamienianie"],"on",{},"config"),o("number.trv_demo_comfort",L,["Comfort temperature","Temperatura komfortowa"],"22",{...e,min:10,max:25,step:.5},"config"),o("number.trv_demo_eco",L,["Eco temperature","Temperatura eko"],"17",{...e,min:10,max:20,step:.5},"config"),o("number.trv_demo_manual",L,["Manual temperature","Temperatura r\u0119czna"],"20",{...e,min:4,max:35,step:.5},"config"),o("number.trv_demo_fast_heat",L,["Fast heating duration","Czas szybkiego grzania"],"30",{min:1,max:180,step:1,mode:"box",unit_of_measurement:"min"},"config"),o("number.trv_demo_response",L,["Response time","Czas reakcji"],"3",{min:1,max:5,step:1,mode:"slider",unit_of_measurement:"min"},"config"),o("number.trv_demo_calibration",L,["Temperature calibration","Kalibracja temperatury"],"0",{min:-10,max:10,step:1,mode:"slider",unit_of_measurement:"\xB0C"},"config")}function a4(){let H={off:["Off","Wy\u0142\u0105czona"],on:["On","W\u0142\u0105czona"]},V={device_class:"problem"},C={min:0,max:1440,step:1,mode:"box",unit_of_measurement:"min"},L={device_class:"duration",unit_of_measurement:"s"},e={device_class:"duration",unit_of_measurement:"h"},r="demo-humidifier";o("humidifier.humidifier_demo",r,"","on",{humidity:55,current_humidity:46,min_humidity:30,max_humidity:80,mode:"auto"}),o("sensor.humidifier_demo_humidity",r,["Humidity","Wilgotno\u015B\u0107"],"46",{device_class:"humidity",unit_of_measurement:"%"}),o("sensor.humidifier_demo_temperature",r,["Temperature","Temperatura"],"21.5",{device_class:"temperature",unit_of_measurement:"\xB0C"}),o("sensor.humidifier_demo_water",r,["Water level","Poziom wody"],"medium",{},null,{empty:["Empty","Pusty"],low:["Low","Niski"],medium:["Medium","\u015Aredni"],high:["High","Wysoki"]}),o("binary_sensor.humidifier_demo_tank_removed",r,["Water tank removed","Zbiornik wody wyj\u0119ty"],"off",V),o("binary_sensor.humidifier_demo_tilted",r,["Tilted","Przechylenie"],"off",V),o("binary_sensor.humidifier_demo_filter_missing",r,["Filter missing","Brak filtra"],"off",V),o("binary_sensor.humidifier_demo_meter_online",r,["Bound meter","Powi\u0105zany termometr"],"on",{device_class:"connectivity"},"diagnostic"),o("sensor.humidifier_demo_filter_clean",r,["Time since filter cleaning","Czas od czyszczenia filtra"],"148",e,"diagnostic"),o("sensor.humidifier_demo_filter_replace",r,["Time since filter replacement","Czas od wymiany filtra"],"1730",e,"diagnostic"),o("switch.humidifier_demo_child_lock",r,["Child lock","Blokada rodzicielska"],"off",{},"config"),o("switch.humidifier_demo_protection",r,["Over-humidify protection","Ochrona przed przewil\u017Ceniem"],"on",{},"config"),o("number.humidifier_demo_threshold",r,["Over-humidify threshold","Pr\xF3g ochrony przed przewil\u017Ceniem"],"65",{min:1,max:99,step:1,mode:"slider",unit_of_measurement:"%"},"config"),o("switch.humidifier_demo_prompt_sound",r,["Prompt sound","D\u017Awi\u0119k powiadomie\u0144"],"on",{},"config"),o("switch.humidifier_demo_alarm_sound",r,["Alarm sound","D\u017Awi\u0119k alarmu"],"on",{},"config"),o("switch.humidifier_demo_dnd",r,["Do not disturb","Nie przeszkadza\u0107"],"on",{},"config"),o("time.humidifier_demo_dnd_start",r,["Do not disturb start","Nie przeszkadza\u0107 od"],"22:00:00",{},"config"),o("time.humidifier_demo_dnd_end",r,["Do not disturb end","Nie przeszkadza\u0107 do"],"07:00:00",{},"config");let t={options:["off","soft","bright"]},a={off:["Off","Wy\u0142\u0105czona"],soft:["Soft","Przyciemniona"],bright:["Bright","Jasna"]},M={device_class:"battery_charging"},n="demo-fan";o("fan.fan_demo",n,"","on",{percentage:40,preset_mode:"natural",oscillating:!0}),o("sensor.fan_demo_battery",n,["Battery","Bateria"],"100",N),o("binary_sensor.fan_demo_charging",n,["Charging","\u0141adowanie"],"off",M,"diagnostic"),o("select.fan_demo_night_light",n,["Night light","Lampka nocna"],"off",t,"config",a);let A="demo-standingfan";o("fan.standing_fan_demo",A,"","off",{percentage:30,preset_mode:"normal",oscillating:!1}),o("sensor.standing_fan_demo_battery",A,["Battery","Bateria"],"64",N),o("binary_sensor.standing_fan_demo_charging",A,["Charging","\u0141adowanie"],"on",M,"diagnostic"),o("switch.standing_fan_demo_horizontal",A,["Horizontal oscillation","Oscylacja pozioma"],"off"),o("switch.standing_fan_demo_vertical",A,["Vertical oscillation","Oscylacja pionowa"],"off"),o("select.standing_fan_demo_night_light",A,["Night light","Lampka nocna"],"soft",t,"config",a),o("number.standing_fan_demo_h_angle",A,["Horizontal oscillation angle","K\u0105t oscylacji poziomej"],"60",{min:30,max:90,step:30,mode:"slider",unit_of_measurement:"\xB0"},"config"),o("switch.standing_fan_demo_child_lock",A,["Child lock","Blokada rodzicielska"],"off",{},"config"),o("switch.standing_fan_demo_display",A,["Display","Wy\u015Bwietlacz"],"on",{},"config"),o("switch.standing_fan_demo_sound",A,["Key tone","D\u017Awi\u0119k przycisk\xF3w"],"on",{},"config"),o("switch.standing_fan_demo_recenter",A,["Return to centre","Powr\xF3t do \u015Brodka"],"on",{},"config");let p="demo-fanpro";o("fan.fan_pro_demo",p,"","on",{percentage:55,preset_mode:"hurricane",oscillating:!0}),o("light.fan_pro_demo_night_light",p,["Night light","Lampka nocna"],"off",{color_mode:"onoff",supported_color_modes:["onoff"]}),o("sensor.fan_pro_demo_battery",p,["Battery","Bateria"],"82",N),o("binary_sensor.fan_pro_demo_charging",p,["Charging","\u0141adowanie"],"off",M,"diagnostic"),o("sensor.fan_pro_demo_h_swing",p,["Horizontal swing angle","K\u0105t obrotu w poziomie"],"90",{unit_of_measurement:"\xB0"},"diagnostic"),o("sensor.fan_pro_demo_v_swing",p,["Vertical swing angle","K\u0105t obrotu w pionie"],"60",{unit_of_measurement:"\xB0"},"diagnostic"),o("switch.fan_pro_demo_vertical",p,["Vertical oscillation","Oscylacja pionowa"],"on"),o("switch.fan_pro_demo_child_lock",p,["Child lock","Blokada rodzicielska"],"off",{},"config"),o("switch.fan_pro_demo_beep",p,["Beep","D\u017Awi\u0119k"],"on",{},"config"),o("switch.fan_pro_demo_indicator",p,["Indicator light","Lampka wska\u017Anika"],"on",{},"config"),o("switch.fan_pro_demo_h_recenter",p,["Horizontal return to centre on power-off","Powr\xF3t do \u015Brodka w poziomie po wy\u0142\u0105czeniu"],"on",{},"config"),o("switch.fan_pro_demo_v_recenter",p,["Vertical return to centre on power-off","Powr\xF3t do \u015Brodka w pionie po wy\u0142\u0105czeniu"],"off",{},"config");for(let[m,x,Z]of[["demo-purifier","air_purifier_demo",!1],["demo-purifiertable","air_purifier_table_demo",!0]])o(`fan.${x}`,m,"",Z?"off":"on",{percentage:50,preset_mode:"auto"}),o(`light.${x}_light`,m,["Light","\u015Awiat\u0142o"],"on",{brightness:128,color_mode:"rgb",supported_color_modes:["rgb"]}),o(`sensor.${x}_pm25`,m,"PM2.5",Z?"4":"12",{device_class:"pm25",unit_of_measurement:"\xB5g/m\xB3"}),o(`sensor.${x}_air_quality`,m,["Air quality","Jako\u015B\u0107 powietrza"],Z?"excellent":"good",{},null,{excellent:["Excellent","Doskona\u0142a"],good:["Good","Dobra"],moderate:["Moderate","Umiarkowana"],unhealthy:["Poor","Z\u0142a"]}),o(`binary_sensor.${x}_filter_door`,m,["Filter door","Klapka filtra"],"off",{device_class:"door"}),o(`binary_sensor.${x}_voc_fault`,m,["VOC sensor fault","Awaria czujnika VOC"],"off",V,"diagnostic"),o(`binary_sensor.${x}_pm25_fault`,m,["PM2.5 sensor fault","Awaria czujnika PM2.5"],"off",V,"diagnostic"),o(`binary_sensor.${x}_fan_fault`,m,["Fan fault","Awaria wentylatora"],"off",V,"diagnostic"),o(`sensor.${x}_filter`,m,["Filter usage","Zu\u017Cycie filtra"],"412",e,"diagnostic"),o(`number.${x}_off_timer`,m,["Off timer","Wy\u0142\u0105cznik czasowy"],Z?"0":"45",C),o(`sensor.${x}_off_timer_remaining`,m,["Off timer remaining","Pozosta\u0142y czas do wy\u0142\u0105czenia"],Z?"0":"2700",L,"diagnostic"),o(`switch.${x}_child_lock`,m,["Child lock","Blokada rodzicielska"],"off",{},"config"),o(`switch.${x}_beep`,m,["Beep","D\u017Awi\u0119k"],"on",{},"config"),o(`select.${x}_indicator`,m,["Indicator light","Lampka wska\u017Anika"],"auto",{options:["off","on","auto"]},"config",{...H,auto:["Auto (light sensor)","Auto (czujnik \u015Bwiat\u0142a)"]}),o(`button.${x}_reset_filter`,m,["Reset filter","Zresetuj filtr"],"unknown",{},"config"),Z&&o(`switch.${x}_wireless_charging`,m,["Wireless charging","\u0141adowanie bezprzewodowe"],"on",{},"config")}function g(H,V,C={}){let L=r1[H];L&&(L.state=V,Object.assign(L.attributes,C),t4())}function n4(H,V){let C=z0.find(e=>e.device_id===V.device).name,L=F0(V.name);return{entity_id:H,state:V.state,attributes:{...V.attributes,friendly_name:L?`${C} ${L}`:C},last_changed:U1,last_updated:U1}}var f2={demo_thermo:{entry_id:"demo_thermo",name:"Thermo-Hygrometer (demo)",model:"indoor_outdoor_thermo_hygrometer",available:!0,device_calibration:!0,device_calibration_value:null,values:{temperature:{raw:21.6,offset:0,entity_id:"sensor.thermo_demo_temperature"},humidity:{raw:47,offset:0,entity_id:"sensor.thermo_demo_humidity"}}},demo_hub2:{entry_id:"demo_hub2",name:"Hub 2 (demo)",model:"hub2",available:!0,device_calibration:!1,device_calibration_value:null,values:{temperature:{raw:21.9,offset:0,entity_id:"sensor.hub2_demo_temperature"},humidity:{raw:44,offset:0,entity_id:"sensor.hub2_demo_humidity"}}},demo_co2:{entry_id:"demo_co2",name:"Meter Pro CO2 (demo)",model:"meter_pro_co2",available:!0,device_calibration:!1,device_calibration_value:null,values:{temperature:{raw:22.3,offset:0,entity_id:"sensor.co2_demo_temperature"},humidity:{raw:41,offset:0,entity_id:"sensor.co2_demo_humidity"},co2:{raw:820,offset:0,entity_id:"sensor.co2_demo_co2"}}}},I1={temperature:.3,humidity:0},u5=new Set,T0=H=>u5.forEach(V=>V({sensors:[structuredClone(f2[H])]}));function P0(H){let V=f2[H];for(let[C,L]of Object.entries(V.values)){if(!L?.entity_id||L.raw===null)continue;let e=L.raw+L.offset;g(L.entity_id,C==="temperature"?e.toFixed(1):String(Math.round(e)))}}function A4(H){let V=f2[H.entry_id];if(!V)throw new Error("Device not found");if(H.type===`${f}/sensors/set_offset`){let[C,L]=R0[H.key],e=Math.round(Math.max(C,Math.min(L,Number(H.offset)))*100)/100;return V.values[H.key].offset=e,P0(H.entry_id),T0(H.entry_id),{offset:e,sensor:structuredClone(V)}}if(H.action==="set"||H.action==="reset"){for(let C of["temperature","humidity"]){let L=H.action==="reset"?0:H[C]??I1[C],e=V.values[C];e.raw=Math.round(((e.raw??0)-I1[C]+L)*10)/10,I1[C]=L}P0(H.entry_id)}return V.device_calibration_value={...I1},T0(H.entry_id),{calibration:{...I1},sensor:structuredClone(V)}}var N0=[{time:O(Date.now()-2*36e5),type:"unlocked",source:"keypad",credential:"passcode",credential_id:3},{time:O(Date.now()-3*36e5),type:"locked",source:"auto_lock"},{time:O(Date.now()-26*36e5),type:"door_left_open"},{time:O(Date.now()-27*36e5),type:"unlocked",source:"manual"}];function W0(H,V={}){let C={time:O(Date.now()),type:H,...V};N0.unshift(C),g("event.lock_ultra_demo_history",C.time,{event_type:H,...V})}var c5="2100-01-01T00:00:00+00:00",y={data:{entry_id:"demo_keypad",name:"Keypad (demo)",model:"keypad",available:!0,state:{battery:76,firmware:1.2,lockout:!1,passcode_locked_out:!1,nfc_locked_out:!1,tamper_alarm:!1,duress_alarm:!1,keypad_enabled:!0,tamper_alarm_enabled:!0,sound_enabled:!0,backlight_mode:"auto",backlight_level:1,lock_button_mode:"timed",lock_button_time:30,passcodes_count:2,nfc_cards_count:1},passcodes:{3:{name:"Family",type:"permanent",start:O(Date.now()-90*$0),end:c5},5:{name:"Cleaner",type:"periodic",weekdays:[1,4],begin_minute:540,end_minute:720}},cards:{1:{name:"Key fob",type:"permanent",start:O(Date.now()-30*$0),end:c5}}},log:[{time:O(Date.now()-2*36e5),type:"unlocked",source:"passcode",credential_id:3,credential_name:"Family"},{time:O(Date.now()-5*36e5),type:"verification_failed",source:"passcode",credential_id:null,unknown_credential:!0},{time:O(Date.now()-9*36e5),type:"unlocked",source:"nfc",credential_id:1,credential_name:"Key fob"},{time:O(Date.now()-20*36e5),type:"locked",source:"lock_button"}],subs:new Set,nextIndex:6,nfc:null,push(){for(let H of this.subs)H({keypads:[structuredClone(this.data)]})},record(H,V,C={}){let L={time:O(Date.now()),type:H,source:V,...C};this.log.unshift(L),g("event.keypad_demo_keypad_history",L.time,{event_type:H,...L})},credential(H){return{name:H.name||"",type:H.type,start:H.start?O(new Date(H.start).getTime()):O(Date.now()),end:H.end?O(new Date(H.end).getTime()):c5}},op(H,V){let C=this.data.state;switch(H){case"refresh":return{passcodes:C.passcodes_count,nfc_cards:C.nfc_cards_count};case"action":return V.action==="cancel_passcode_lockout"&&(C.passcode_locked_out=!1),V.action==="cancel_nfc_lockout"&&(C.nfc_locked_out=!1),V.action==="clear_tamper_alarm"&&(C.tamper_alarm=!1),V.action==="cancel_duress_alarm"&&(C.duress_alarm=!1),C.lockout=!!(C.passcode_locked_out||C.nfc_locked_out),null;case"add_passcode":{if(!/^\d{6,12}$/.test(String(V.code)))throw new Error("ValueError: passcode must be 6-12 digits");if(["time_limited","one_time"].includes(V.type)&&!V.end)throw new Error("ValueError: this passcode type needs an end time");if(V.type==="periodic"&&!(V.weekdays||[]).length)throw new Error("ValueError: select at least one weekday");let L=this.nextIndex++;return this.data.passcodes[L]={...this.credential(V),...V.type==="periodic"?{weekdays:V.weekdays,begin_minute:V.begin_minute,end_minute:V.end_minute}:{}},C.passcodes_count=(C.passcodes_count??0)+1,{index:L}}case"delete_passcode":return delete this.data.passcodes[V.index],C.passcodes_count=Math.max(0,(C.passcodes_count??1)-1),null;case"rename":{let L=this.data[V.kind];return(L[V.index]??={name:"",type:"unknown"}).name=V.name,null}case"nfc_start":return this.nfc={polls:0},{index:Math.max(1,...Object.keys(this.data.cards).map(Number))+1};case"nfc_status":return this.nfc&&this.nfc.polls++,{status:this.nfc&&(this.nfc.tapped||this.nfc.polls>=4)?"success":"idle"};case"nfc_finish":return this.data.cards[V.index]=this.credential(V),C.nfc_cards_count=(C.nfc_cards_count??0)+1,this.nfc=null,{index:V.index};case"nfc_delete":return delete this.data.cards[V.index],C.nfc_cards_count=Math.max(0,(C.nfc_cards_count??1)-1),null;default:throw new Error(`demo: unknown op ${H}`)}}},I0={code:()=>{let[H,V]=Object.entries(y.data.passcodes)[0]||[];y.record("unlocked","passcode",{credential_id:H?Number(H):null,credential_name:V?.name}),y0(),W0("unlocked",{source:"keypad",credential:"passcode",credential_id:H?Number(H):void 0}),y.push()},card:()=>{if(y.nfc){y.nfc.tapped=!0;return}let[H,V]=Object.entries(y.data.cards)[0]||[];y.record("unlocked","nfc",{credential_id:H?Number(H):null,credential_name:V?.name}),y.push()},wrong:()=>{for(let H=0;H<3;H++)y.record("verification_failed","passcode",{credential_id:null,unknown_credential:!0});y.record("locked_out","alarm"),Object.assign(y.data.state,{lockout:!0,passcode_locked_out:!0}),y.push()},tamper:()=>{y.record("tamper","alarm"),y.data.state.tamper_alarm=!0,y.push()}},d4=H=>typeof H=="string"&&H.startsWith("demo_"),S2={};function l4(H,V){let C=r1[H];if(clearInterval(S2[H]),V.startsWith("stop")){let r=C.attributes.current_position??C.attributes.current_tilt_position;g(H,r===0?"closed":"open");return}let L=V.startsWith("open"),e="current_position"in C.attributes?"current_position":"current_tilt_position"in C.attributes?"current_tilt_position":null;if(!e){g(H,L?"opening":"closing"),S2[H]=window.setTimeout(()=>g(H,L?"open":"closed"),3e3);return}g(H,L?"opening":"closing"),S2[H]=window.setInterval(()=>{let r=Math.max(0,Math.min(100,C.attributes[e]+(L?10:-10)));r===0||r===100?(clearInterval(S2[H]),g(H,r===0?"closed":"open",{[e]:r})):g(H,L?"opening":"closing",{[e]:r})},300)}function s4(H,V,C){let L=C.entity_id,e=r1[L];if(!e)return!1;if((H==="cover"||H==="button")&&c0(H,V,C))return!0;if(H==="switch")g(L,V==="turn_on"?"on":"off");else if(H==="select")g(L,C.option);else if(H==="number"){g(L,String(C.value));let r=L.replace(/^number\.(.*)_off_timer$/,"sensor.$1_off_timer_remaining");r!==L&&g(r,String(Number(C.value)*60))}else H==="time"?g(L,C.time):H==="button"?g(L,O(Date.now())):["light","fan","humidifier"].includes(H)?g(L,V==="turn_on"?"on":"off"):H==="cover"?l4(L,V):H==="climate"?V==="set_temperature"?(g(L,e.state,{temperature:C.temperature}),g("binary_sensor.trv_demo_valve",C.temperature>e.attributes.current_temperature?"on":"off"),g(L,e.state,{hvac_action:C.temperature>e.attributes.current_temperature?"heating":"idle"})):V==="set_hvac_mode"&&g(L,C.hvac_mode,{hvac_action:C.hvac_mode==="off"?"off":"heating"}):H==="vacuum"?V==="start"?g(L,"cleaning"):(g(L,"returning"),setTimeout(()=>g(L,"docked"),3e3)):H==="lock"&&_0(L,V)?L==="lock.lock_ultra_demo"&&W0(V==="lock"?"locked":"unlocked",{source:"app"}):H==="lock"&&g(L,V==="lock"?"locked":"unlocked");return!0}function U0(H){let V=M=>new Promise(n=>setTimeout(n,M)),C=async M=>{switch(M.type){case`${f}/panel/devices`:return{devices:z0,offset_limits:R0,demo:!0};case`${f}/sensors/set_offset`:case`${f}/sensors/device_calibration`:return await V(M.type===`${f}/sensors/set_offset`?150:700),A4(M);case`${f}/covers/action`:return await V(200),u0(M);case`${f}/calibration/action`:return await V(250),m5(M);case`${f}/keypad/op`:{await V(M.op==="nfc_status"||M.op==="rename"?50:450);let n=y.op(M.op,M.data||{});return setTimeout(()=>y.push(),0),{result:n,keypad:structuredClone(y.data)}}case"history/history_during_period":{let n=M.entity_ids||[];if(!n.every(p=>p in r1))return{};let A=/^event\.lock_.*_history$/.test(n[0])?N0:n[0]==="event.keypad_demo_keypad_history"?y.log:[];return{[n[0]]:[...A].reverse().map(p=>({s:p.time,lu:new Date(p.time).getTime()/1e3,a:{event_type:p.type,...p}}))}}default:if(d4(M.entry_id)||String(M.type).startsWith(`${f}/`))throw new Error("Not available in demo mode");return H.callWS(M)}},L=async(M,n)=>{if(n.type===`${f}/sensors/subscribe`)return u5.add(M),setTimeout(()=>M({sensors:Object.values(f2).map(A=>structuredClone(A)),full:!0}),10),()=>{u5.delete(M)};if(n.type===`${f}/calibration/subscribe`){let A=k0(n.entry_id,M);if(A)return A}if(n.type===`${f}/covers/subscribe`){let A=v0(n.entry_id,M);if(A)return A}if(n.type===`${f}/keypad/subscribe`)return y.subs.add(M),setTimeout(()=>M({keypads:[structuredClone(y.data)],full:!0}),10),()=>{y.subs.delete(M)};if(String(n.type).startsWith(`${f}/`))throw new Error("Not available in demo mode");return H.connection.subscribeMessage(M,n)};x5=(H.locale?.language||H.language||"en").startsWith("pl");let e=Object.fromEntries(Object.entries(H.entities??{}).filter(([,M])=>M.platform!==f)),r={...H.states};for(let[M,n]of Object.entries(r1))r[M]=n4(M,n),e[M]={entity_id:M,device_id:n.device,platform:f,entity_category:n.category};let t=(M,n)=>{let A=r1[M.entity_id];if(!A)return H.formatEntityState?H.formatEntityState(M,n):n??M.state;let p=n??M.state;if(A.labels?.[p])return F0(A.labels[p]);try{if(H.formatEntityState)return H.formatEntityState(M,n)}catch{}if(M.attributes.device_class==="timestamp"&&!Number.isNaN(Date.parse(p)))return new Date(p).toLocaleString(x5?"pl-PL":"en-GB",{dateStyle:"medium",timeStyle:"short"});let m=M.attributes.unit_of_measurement;return m?`${p} ${m}`:p},a=new Proxy(H.connection,{get(M,n){if(n==="subscribeMessage")return L;let A=M[n];return typeof A=="function"?A.bind(M):A}});return new Proxy(H,{get(M,n){switch(n){case"callWS":return C;case"connection":return a;case"states":return r;case"entities":return e;case"formatEntityState":return t;case"sbDemo":return!0;case"sbDemoEvent":return v2;case"sbDemoLockEvent":return h2;case"callService":return async(A,p,m={})=>{if(s4(A,p,m)){await V(300);return}return M.callService(A,p,m)};default:{let A=M[n];return typeof A=="function"?A.bind(M):A}}}})}var k=u`
  :host {
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, sans-serif));
    -webkit-font-smoothing: var(--ha-font-smoothing, antialiased);
  }
  * {
    box-sizing: border-box;
  }

  /* cards */
  .card {
    display: block;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
    border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    box-shadow: var(--ha-card-box-shadow, none);
    color: var(--primary-text-color);
  }
  .card-header {
    font-size: 20px;
    line-height: 28px;
    font-weight: 400;
    padding: 16px 16px 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-header .spacer {
    flex: 1;
  }
  .card-content {
    padding: 12px 16px 16px;
  }
  .card-actions {
    border-top: 1px solid var(--divider-color);
    padding: 8px 12px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .card-actions .spacer {
    flex: 1;
  }
  .secondary {
    color: var(--secondary-text-color);
  }
  .intro {
    color: var(--secondary-text-color);
    font-size: 14px;
    line-height: 20px;
    margin: 0;
  }

  /* list rows (ha-md-list-item look) */
  .list {
    display: flex;
    flex-direction: column;
    padding: 4px 0;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 8px 16px;
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    font: inherit;
    text-align: left;
    width: 100%;
  }
  .item + .item {
    border-top: 1px solid var(--divider-color);
  }
  a.item,
  button.item {
    cursor: pointer;
  }
  a.item:hover,
  button.item:hover {
    background: var(--secondary-background-color);
  }
  a.item:focus-visible,
  button.item:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
  .item .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .item .headline {
    font-size: 16px;
    line-height: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item .supporting {
    font-size: 14px;
    line-height: 20px;
    color: var(--secondary-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item .meta {
    color: var(--secondary-text-color);
    font-size: 14px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .item sb-icon.leading {
    color: var(--state-icon-color, var(--secondary-text-color));
    flex: none;
  }

  /* buttons (ha-button look) */
  .btn {
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    min-height: 36px;
    padding: 8px 16px;
    border-radius: 18px;
    border: none;
    background: none;
    color: var(--primary-color);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  }
  .btn.outlined {
    border: 1px solid var(--outline-color, var(--divider-color));
  }
  .btn.filled {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .btn.filled:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 88%, #000);
  }
  .btn.danger {
    color: var(--error-color, #db4437);
  }
  .btn.small {
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex: none;
  }
  .icon-btn:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .icon-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  /* form fields */
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--secondary-text-color);
  }
  .field.grow {
    flex: 1;
    min-width: 160px;
  }
  input:not([type="checkbox"]):not([type="range"]),
  select {
    font: inherit;
    font-size: 15px;
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--outline-color, var(--divider-color));
    background: var(--mdc-text-field-fill-color, var(--secondary-background-color));
    color: var(--primary-text-color);
  }
  input:focus,
  select:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: -1px;
  }
  input:disabled,
  select:disabled {
    opacity: 0.55;
  }
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--primary-color);
  }
  input[type="range"] {
    accent-color: var(--primary-color);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
  }
  .row.end {
    justify-content: flex-end;
  }

  /* chips and alerts */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 4px 10px;
    font-size: 13px;
    line-height: 20px;
  }
  .chip b {
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 22%, transparent);
  }
  .chip.good {
    background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
  }
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 8px 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 20px;
    background: color-mix(in srgb, var(--alert-color, var(--info-color, #039be5)) 12%, transparent);
  }
  .alert sb-icon {
    color: var(--alert-color, var(--info-color, #039be5));
    flex: none;
  }
  .alert .text {
    flex: 1;
    min-width: 0;
  }
  .alert.error {
    --alert-color: var(--error-color, #db4437);
  }
  .alert.warning {
    --alert-color: var(--warning-color, #ffa600);
  }
  .alert.success {
    --alert-color: var(--success-color, #43a047);
  }
  .error-text {
    color: var(--error-color, #db4437);
  }
  .ok-text {
    color: var(--success-color, #43a047);
  }

  /* tables */
  table.data {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  table.data td {
    padding: 10px 16px;
    border-top: 1px solid var(--divider-color);
    vertical-align: middle;
  }
  table.data tr:first-child td {
    border-top: none;
  }
  table.data td.num {
    color: var(--secondary-text-color);
    width: 1%;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  table.data td.actions {
    text-align: right;
    white-space: nowrap;
  }
  .sub {
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  .spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--divider-color);
    border-top-color: var(--primary-color);
    animation: spin 0.9s linear infinite;
    display: inline-block;
    flex: none;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 3s;
    }
  }
`,t1=u`
  .page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (max-width: 600px) {
    .page {
      padding: 8px;
      gap: 8px;
    }
  }
`;var p1=class extends z{constructor(){super(...arguments);this.path="";this.size=24}render(){return i`<svg width=${this.size} height=${this.size} viewBox="0 0 24 24" aria-hidden="true">
      ${d`<path d=${this.path}></path>`}
    </svg>`}};p1.styles=u`
    :host {
      display: inline-flex;
      line-height: 0;
    }
    svg {
      fill: currentColor;
    }
  `,l([c()],p1.prototype,"path",2),l([c({type:Number})],p1.prototype,"size",2),p1=l([h("sb-icon")],p1);var K0=["lock","keypad","cover","light","switch","plug","appliance","sensor","other"],p4={lock:A2,keypad:i2,cover:M2,light:n2,switch:m2,plug:U3,appliance:o2,sensor:p2,other:p3},m4=[[/co2/,w3],[/contact/,g3],[/motion|presence/,E3],[/leak/,H0],[/garage/,b3],[/strip|rope|bar/,P3],[/^bot$/,G3],[/air_purifier/,r3],[/thermostat_radiator/,K3],[/roller_shade/,Q3],[/blind_tilt/,s3]];function g2(H){let V=m4.find(([C])=>C.test(H.model));return V?V[1]:H.kind==="appliance"&&H.model.includes("vacuum")?s2:H.kind==="appliance"&&H.model.includes("humidifier")?y1:p4[H.kind]}var c4=new Set(["eu","us","led","rgb","rgbic","rgbicww","co2","1pm","2pm"]);function k2(H){return H.split("_").map(V=>{if(c4.has(V)||/^[a-z]\d+$/.test(V))return V.toUpperCase();let C=/^([a-z]+)(\d+)$/.exec(V);return C?`${C[1][0].toUpperCase()}${C[1].slice(1)} ${C[2]}`:V[0].toUpperCase()+V.slice(1)}).join(" ")}function c1(H,V){return!V.device_id||!H.entities?[]:Object.values(H.entities).filter(C=>C.device_id===V.device_id&&!C.hidden).map(C=>({entity_id:C.entity_id,domain:C.entity_id.split(".")[0],category:C.entity_category??null,translation_key:C.translation_key,state:H.states[C.entity_id]})).sort((C,L)=>C.entity_id.localeCompare(L.entity_id))}function m1(H,V,C){return c1(H,V).find(C)}function v1(H,V){let C=V.state?.attributes.friendly_name??V.entity_id,L=H.name+" ",e=C.startsWith(L)?C.slice(L.length):C;return e?e[0].toUpperCase()+e.slice(1):C}function W(H,V){if(!V)return"\u2014";if(H.formatEntityState)return H.formatEntityState(V);let C=V.attributes.unit_of_measurement;return C?`${V.state} ${C}`:V.state}function G0(H,V){let C=m1(H,V,e=>e.domain==="sensor"&&e.state?.attributes.device_class==="battery"),L=Number(C?.state?.state);return C&&Number.isFinite(L)?L:null}function Q0(H,V){let L={lock:["lock"],keypad:[],cover:["cover"],light:["light"],switch:["switch","cover"],plug:["switch"],appliance:["humidifier","fan","vacuum","climate"],sensor:["sensor","binary_sensor"],other:[]}[V.kind],e=m1(H,V,r=>L.includes(r.domain)&&r.category===null&&(V.kind!=="sensor"||r.state?.attributes.device_class==="temperature"))??(V.kind==="sensor"?m1(H,V,r=>r.domain==="binary_sensor"&&r.category===null):void 0);return e?.state?W(H,e.state):""}var x1=class extends S{constructor(){super(...arguments);this.devices=[]}render(){if(!this.devices.length)return i`<div class="page">
        <div class="card"><div class="card-content">${this.t("devices.none")}</div></div>
        ${this.error?i`<div class="alert error"><div class="text">${this.error}</div></div>`:s}
      </div>`;let C=K0.map(L=>({kind:L,devices:this.devices.filter(e=>e.kind===L).sort((e,r)=>e.name.localeCompare(r.name))})).filter(L=>L.devices.length);return i`<div class="page">
      <p class="intro">${this.t("devices.intro")}</p>
      ${C.map(L=>i`<section class="card">
          <h2 class="card-header">${this.t(`devices.groups.${L.kind}`)}</h2>
          <div class="list">${L.devices.map(e=>this._row(e))}</div>
        </section>`)}
    </div>`}_row(C){let L=G0(this.hass,C),e=C.available?Q0(this.hass,C):"",r=[C.model_name??k2(C.model),e].filter(Boolean).join(" \xB7 "),t=`/device/${encodeURIComponent(C.entry_id)}`;return i`<a class="item" href="#${t}" data-entry=${C.entry_id}
      @click=${a=>{a.preventDefault(),e3(this,t)}}>
      <span class="badge ${C.kind}"><sb-icon .path=${g2(C)}></sb-icon></span>
      <span class="text">
        <span class="headline">${C.name}</span>
        <span class="supporting">${r}</span>
      </span>
      <span class="meta">
        ${C.available?s:i`<span class="unavailable"><sb-icon .path=${g1} .size=${18}></sb-icon>${this.t("common.unavailable")}</span>`}
        ${L!==null?i`<span class="battery ${L<=15?"low":""}">
              <sb-icon .path=${L<=15?A3:n3} .size=${18}></sb-icon>${L}%
            </span>`:s}
        <sb-icon .path=${k1}></sb-icon>
      </span>
    </a>`}};x1.styles=[k,t1,u`
      h2.card-header {
        margin: 0;
      }
      .badge {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        color: var(--badge-color);
        background: color-mix(in srgb, var(--badge-color) 16%, transparent);
        --badge-color: var(--state-icon-color, var(--primary-color));
      }
      .badge.lock {
        --badge-color: var(--state-lock-locked-color, var(--green-color, #43a047));
      }
      .badge.keypad {
        --badge-color: var(--indigo-color, #3f51b5);
      }
      .badge.sensor {
        --badge-color: var(--orange-color, #ff9800);
      }
      .badge.cover {
        --badge-color: var(--purple-color, #926bc7);
      }
      .badge.light {
        --badge-color: var(--yellow-color, #ffd500);
      }
      .badge.switch {
        --badge-color: var(--cyan-color, #00bcd4);
      }
      .badge.appliance {
        --badge-color: var(--teal-color, #009688);
      }
      .badge.plug {
        --badge-color: var(--amber-color, #ffc107);
      }
      .badge.other {
        --badge-color: var(--blue-color, #2196f3);
      }
      .battery,
      .unavailable {
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      .battery.low,
      .unavailable {
        color: var(--error-color, #db4437);
      }
    `],l([c({attribute:!1})],x1.prototype,"devices",2),l([c()],x1.prototype,"error",2),x1=l([h("sb-device-list")],x1);var M1=class extends z{constructor(){super(...arguments);this.checked=!1;this.disabled=!1;this.label=""}render(){return i`<button
      role="switch"
      aria-checked=${this.checked?"true":"false"}
      aria-label=${this.label}
      ?disabled=${this.disabled}
      @click=${this._toggle}
    ></button>`}_toggle(){this.checked=!this.checked,this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.checked},bubbles:!0,composed:!0}))}};M1.styles=u`
    :host {
      display: inline-flex;
    }
    button {
      position: relative;
      width: 36px;
      height: 20px;
      padding: 0;
      border: none;
      border-radius: 10px;
      background: var(--switch-unchecked-track-color, var(--disabled-text-color, #9e9e9e));
      opacity: 0.6;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    button::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--switch-unchecked-button-color, #fafafa);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.15s;
    }
    :host([checked]) button {
      background: var(--switch-checked-track-color, var(--primary-color));
      opacity: 1;
    }
    :host([checked]) button::after {
      transform: translateX(16px);
      background: var(--switch-checked-button-color, #fff);
    }
    :host([disabled]) button {
      cursor: default;
      opacity: 0.35;
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `,l([c({type:Boolean,reflect:!0})],M1.prototype,"checked",2),l([c({type:Boolean,reflect:!0})],M1.prototype,"disabled",2),l([c()],M1.prototype,"label",2),M1=l([h("sb-switch")],M1);var v4={switch:m2,select:y3,number:j3,time:u3,button:O3,lock:A2,binary_sensor:v3,event:l3,cover:M2,light:n2,fan:o2,humidifier:y1,climate:X3,vacuum:s2},X=class extends S{constructor(){super(...arguments);this._busy=!1}_moreInfo(){N1(this,"hass-more-info",{entityId:this.entity.entity_id})}async _call(C,L,e={}){this._busy=!0,this._error=void 0;try{await this.hass.callService(C,L,{entity_id:this.entity.entity_id,...e})}catch(r){this._error=b(r)}finally{this._busy=!1}}render(){let C=this.entity,L=C.state,e=!L||L.state==="unavailable",r=customElements.get("ha-state-icon")&&L?i`<ha-state-icon .hass=${this.hass} .stateObj=${L}></ha-state-icon>`:i`<sb-icon .path=${v4[C.domain]??k3}></sb-icon>`;return i`<div class="item">
        <span class="leading">${r}</span>
        <button class="text name" @click=${this._moreInfo}>
          <span class="headline">${v1(this.device,C)}</span>
          ${this._error?i`<span class="supporting error-text">${this._error}</span>`:s}
        </button>
        <span class="control">${e?i`<span class="secondary">${W(this.hass,L)}</span>`:this._control()}</span>
      </div>`}_control(){let C=this.entity,L=C.state,e=L.attributes;switch(C.domain){case"switch":case"light":case"fan":case"humidifier":return i`${C.domain!=="switch"?i`<span class="secondary state">${W(this.hass,L)}</span>`:s}
          <sb-switch .checked=${L.state==="on"} ?disabled=${this._busy} .label=${v1(this.device,C)}
            @change=${r=>this._call(C.domain,r.detail.checked?"turn_on":"turn_off")}
          ></sb-switch>`;case"cover":{let r=e.current_position,t=e.current_tilt_position,a=r??t;return i`<span class="secondary state">${W(this.hass,L)}${a!==void 0?` \xB7 ${a}%`:""}</span>
          <span class="cover-btns">
            <button class="icon-btn" title=${this.t("controls.open")} aria-label=${this.t("controls.open")}
              ?disabled=${this._busy||L.state==="opening"} @click=${()=>this._call("cover",r===void 0&&t!==void 0?"open_cover_tilt":"open_cover")}>
              <sb-icon .path=${o3}></sb-icon></button>
            <button class="icon-btn" title=${this.t("controls.stop")} aria-label=${this.t("controls.stop")}
              ?disabled=${this._busy} @click=${()=>this._call("cover",r===void 0&&t!==void 0?"stop_cover_tilt":"stop_cover")}>
              <sb-icon .path=${Y3}></sb-icon></button>
            <button class="icon-btn" title=${this.t("controls.close")} aria-label=${this.t("controls.close")}
              ?disabled=${this._busy||L.state==="closing"} @click=${()=>this._call("cover",r===void 0&&t!==void 0?"close_cover_tilt":"close_cover")}>
              <sb-icon .path=${M3}></sb-icon></button>
          </span>`}case"vacuum":{let r=L.state==="cleaning";return i`<span class="secondary state">${W(this.hass,L)}</span>
          <button class="icon-btn" title=${this.t(r?"controls.dock":"controls.start")}
            aria-label=${this.t(r?"controls.dock":"controls.start")} ?disabled=${this._busy}
            @click=${()=>this._call("vacuum",r?"return_to_base":"start")}>
            <sb-icon .path=${r?T3:I3}></sb-icon></button>`}case"climate":{let r=e.temperature,t=Number(e.target_temp_step??.5),a=n=>{let A=Math.min(Number(e.max_temp??35),Math.max(Number(e.min_temp??4),(r??0)+n));this._call("climate","set_temperature",{temperature:A})},M=this.hass.config?.unit_system?.temperature??"\xB0C";return i`<span class="secondary state">${W(this.hass,L)}${e.current_temperature!==void 0?` \xB7 ${e.current_temperature} ${M}`:""}</span>
          ${r!=null?i`<span class="cover-btns">
                <button class="icon-btn" title="−" aria-label="−" ?disabled=${this._busy} @click=${()=>a(-t)}>
                  <sb-icon .path=${d2}></sb-icon></button>
                <span class="temp">${r} ${M}</span>
                <button class="icon-btn" title="+" aria-label="+" ?disabled=${this._busy} @click=${()=>a(t)}>
                  <sb-icon .path=${_1}></sb-icon></button>
              </span>`:s}`}case"select":return i`<select ?disabled=${this._busy} aria-label=${v1(this.device,C)}
          @change=${r=>this._call("select","select_option",{option:r.target.value})}>
          ${e.options.map(r=>i`<option value=${r} ?selected=${r===L.state}>${this._optionLabel(r)}</option>`)}
        </select>`;case"number":{let r=Number(e.min??0),t=Number(e.max??100),a=Number(e.step??1),M=e.unit_of_measurement?` ${e.unit_of_measurement}`:"",n=A=>{let p=Number(A.target.value);Number.isFinite(p)&&p>=r&&p<=t&&this._call("number","set_value",{value:p})};return e.mode==="slider"||e.mode!=="box"&&t-r<=10?i`<span class="slider">
            <input type="range" min=${r} max=${t} step=${a} .value=${L.state} ?disabled=${this._busy}
              aria-label=${v1(this.device,C)} @change=${n} />
            <span class="value">${W(this.hass,L)}</span>
          </span>`:i`<span class="box">
          <input type="number" min=${r} max=${t} step=${a} .value=${L.state} ?disabled=${this._busy}
            aria-label=${v1(this.device,C)} @change=${n} />${M}
        </span>`}case"time":return i`<input type="time" .value=${L.state.slice(0,5)} ?disabled=${this._busy}
          aria-label=${v1(this.device,C)}
          @change=${r=>{let t=r.target.value;t&&this._call("time","set_value",{time:`${t}:00`})}} />`;case"button":return i`<button class="btn" ?disabled=${this._busy} @click=${()=>this._call("button","press")}>
          ${this.t("settings.press")}
        </button>`;case"lock":{let r=L.state==="locked";return i`<span class="secondary">${W(this.hass,L)}</span>
          <button class="btn outlined" ?disabled=${this._busy} @click=${()=>this._call("lock",r?"unlock":"lock")}>
            ${this.t(r?"common.unlock":"common.lock")}
          </button>`}default:return i`<span class="secondary state">${W(this.hass,L)}</span>`}}_optionLabel(C){let L=this.entity.state;return this.hass.formatEntityState?this.hass.formatEntityState(L,C):C}};X.styles=[k,u`
      :host {
        display: block;
      }
      .item {
        min-height: 52px;
        padding: 4px 16px;
      }
      .leading {
        color: var(--state-icon-color, var(--secondary-text-color));
        display: inline-flex;
        width: 40px;
        justify-content: center;
        flex: none;
      }
      button.name {
        background: none;
        border: none;
        padding: 0;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .control {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-end;
        text-align: right;
        flex: none;
        max-width: 60%;
      }
      .cover-btns {
        display: inline-flex;
        align-items: center;
      }
      .temp {
        min-width: 4.5em;
        text-align: center;
        white-space: nowrap;
      }
      .state {
        white-space: nowrap;
      }
      select {
        max-width: 220px;
      }
      .slider {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .slider input {
        width: 140px;
      }
      .slider .value {
        min-width: 48px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .box input {
        width: 96px;
        text-align: right;
      }
      @media (max-width: 450px) {
        .slider input {
          width: 96px;
        }
      }
    `],l([c({attribute:!1})],X.prototype,"device",2),l([c({attribute:!1})],X.prototype,"entity",2),l([v()],X.prototype,"_busy",2),l([v()],X.prototype,"_error",2),X=l([h("sb-entity-row")],X);var J=class extends S{constructor(){super(...arguments);this.busy=!1}message(C){N1(this,"keypad-message",C)}async run(C){try{await C()}catch{}}};l([c({attribute:!1})],J.prototype,"keypad",2),l([c({attribute:!1})],J.prototype,"op",2),l([c({type:Boolean})],J.prototype,"busy",2);function _2(H){return new Date(H.getTime()-H.getTimezoneOffset()*6e4).toISOString().slice(0,16)}function Z5(H=6){let V=new Uint32Array(H);return crypto.getRandomValues(V),Array.from(V,C=>C%10).join("")}var h5=H=>`${String(Math.floor(H/60)).padStart(2,"0")}:${String(H%60).padStart(2,"0")}`,S5=H=>{let[V,C]=(H||"0:0").split(":").map(Number);return V*60+C};var K1=class extends J{_action(V){this.run(async()=>{await this.op("action",{action:V}),this.message(this.t("common.done"))})}render(){let V=this.keypad.state,C=[];if(V.lockout){let L=["passcode","nfc","fingerprint"].filter(e=>V[`${e}_locked_out`]);C.push(i`<div class="alert error">
        <sb-icon .path=${B3}></sb-icon>
        <div class="text">${this.t("keypad.lockout")}</div>
        ${(L.length?L:["passcode","nfc"]).map(e=>i`<button class="btn small" data-action="cancel_${e}_lockout" ?disabled=${this.busy}
            @click=${()=>this._action(`cancel_${e}_lockout`)}>${this.t("keypad.lift")}: ${this.t(`keypad.lockout_kinds.${e}`)}</button>`)}
      </div>`)}return V.tamper_alarm&&C.push(i`<div class="alert error">
        <sb-icon .path=${q3}></sb-icon><div class="text">${this.t("keypad.tamper")}</div>
        <button class="btn small" data-action="clear_tamper_alarm" ?disabled=${this.busy}
          @click=${()=>this._action("clear_tamper_alarm")}>${this.t("keypad.clear")}</button>
      </div>`),V.duress_alarm&&C.push(i`<div class="alert error">
        <sb-icon .path=${t3}></sb-icon><div class="text">${this.t("keypad.duress")}</div>
        <button class="btn small" data-action="cancel_duress_alarm" ?disabled=${this.busy}
          @click=${()=>this._action("cancel_duress_alarm")}>${this.t("common.cancel")}</button>
      </div>`),i`${C}
      <section class="card">
        <div class="list">
          ${V.battery!==void 0?i`<div class="item"><span class="text">${this.t("keypad.battery")}</span>
                <span class="meta ${V.battery<=15?"error-text":""}">${V.battery}%${V.battery_charging?` \xB7 ${this.t("keypad.charging")}`:""}</span></div>`:s}
          ${V.passcodes_count!==void 0?i`<div class="item"><span class="text">${this.t("keypad.on_device")}</span>
                <span class="meta">${this.t("keypad.on_device_value",{p:V.passcodes_count,c:V.nfc_cards_count??"?"})}</span></div>`:s}
          ${V.firmware?i`<div class="item"><span class="text">${this.t("keypad.firmware")}</span><span class="meta">${V.firmware}</span></div>`:s}
        </div>
      </section>`}};K1.styles=[k,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .item {
        min-height: 48px;
      }
    `],K1=l([h("sb-keypad-status")],K1);var x4=["permanent","time_limited","one_time","emergency","periodic"],u4=["permanent","time_limited","emergency"],q0=864e5,Z4=60,I=class extends J{constructor(){super(...arguments);this.kind="passcodes";this._existing={index:"",name:""}}disconnectedCallback(){super.disconnectedCallback(),clearInterval(this._nfcTimer)}willUpdate(C){C.has("kind")&&(this._form=void 0,this._rename=void 0)}get _isCards(){return this.kind==="cards"}_typeLabel(C){return this.t(`keypad.types.${C||"unknown"}`)}_validity(C){if(C.type==="periodic"){let L=E1(this.hass,"keypad.weekdays");return`${(C.weekdays||[]).map(e=>L[e]).join(" ")} \xB7 ${h5(C.begin_minute??0)}\u2013${h5(C.end_minute??0)}`}return!C.end||C.end.startsWith("2100")?this.t("keypad.always"):`${j1(this.hass,C.start)} \u2013 ${j1(this.hass,C.end)}`}_newForm(){let C=new Date;this._form={name:"",code:Z5(6),type:"permanent",start:_2(C),end:_2(new Date(C.getTime()+q0)),weekdays:[0,1,2,3,4],begin:"08:00",endTime:"17:00"}}_patch(C){this._form={...this._form,...C}}_savePasscode(){let C=this._form,L={name:C.name,code:C.code,type:C.type};["time_limited","one_time","periodic"].includes(C.type)&&(L.start=C.start||null,L.end=C.end||null),C.type==="periodic"&&(L.weekdays=C.weekdays,L.begin_minute=S5(C.begin),L.end_minute=S5(C.endTime)),this.run(async()=>{let e=await this.op("add_passcode",L);this._form=void 0,this.message(this.t("keypad.code_saved",{index:e.index,code:C.code}))})}_delete(C,L){confirm(this.t("keypad.confirm_delete",{name:L.name||`#${C}`}))&&this.run(()=>this.op(this._isCards?"nfc_delete":"delete_passcode",{index:Number(C)}))}_saveRename(){let C=this._rename;this.run(async()=>{await this.op("rename",{kind:this.kind,index:Number(C.index),name:C.name},{quiet:!0}),this._rename=void 0})}_saveExisting(){let C=this._existing;C.index!==""&&this.run(async()=>{await this.op("rename",{kind:this.kind,index:Number(C.index),name:C.name},{quiet:!0}),this._existing={index:"",name:""}})}_startCard(){let C=this._form;this.run(async()=>{let L=await this.op("nfc_start",{type:C.type});this._nfc={index:L.index,left:Z4},clearInterval(this._nfcTimer);let e=!1;this._nfcTimer=window.setInterval(async()=>{if(!(e||!this._nfc)){e=!0;try{let r={...this._nfc,left:this._nfc.left-1},t=await this.op("nfc_status",{},{quiet:!0});if(t.status&&t.status!=="idle"){if(clearInterval(this._nfcTimer),t.status==="success"){let a={index:r.index,type:C.type,name:C.name};C.type==="time_limited"&&Object.assign(a,{start:C.start,end:C.end}),await this.op("nfc_finish",a,{quiet:!0})}r.status=t.status}else r.left<=0&&(clearInterval(this._nfcTimer),r.status="timeout");this._nfc=r}catch{clearInterval(this._nfcTimer),this._nfc={...this._nfc,status:"failed"}}finally{e=!1}}},1e3)})}_closeNfc(){clearInterval(this._nfcTimer),this._nfc=void 0,this._form=void 0}render(){let C=Object.entries(this.keypad[this.kind]||{}).sort((L,e)=>Number(L[0])-Number(e[0]));return i`<section class="card">
        ${C.length?i`<div class="list">${C.map(([L,e])=>this._row(L,e))}</div>`:i`<div class="card-content secondary">${this.t("keypad.none_yet")}</div>`}
        ${this._nfc?this._nfcView():this._form?this._isCards?this._cardForm():this._passcodeForm():s}
        ${!this._form&&!this._nfc?i`<div class="card-actions">
              <button class="btn filled" data-act="new" @click=${this._newForm}>
                <sb-icon .path=${_1} .size=${18}></sb-icon>${this.t(this._isCards?"keypad.add_card":"keypad.add_code")}
              </button>
            </div>`:s}
      </section>
      ${this._existingForm()}`}_row(C,L){let e=this._rename?.index===C;return i`<div class="item" data-index=${C}>
      <span class="idx">#${C}</span>
      ${e?i`<span class="text rename">
            <input .value=${this._rename.name} maxlength="40" aria-label=${this.t("keypad.name")}
              @input=${r=>this._rename={index:C,name:r.target.value}} />
            <button class="btn filled small" data-act="rename-save" @click=${this._saveRename}>${this.t("common.save")}</button>
            <button class="btn small" @click=${()=>this._rename=void 0}>${this.t("common.cancel")}</button>
          </span>`:i`<span class="text">
              <span class="headline">${L.name||"\u2014"}</span>
              <span class="supporting">${this._typeLabel(L.type)} · ${this._validity(L)}</span>
            </span>
            <button class="icon-btn" title=${this.t("common.rename")} aria-label=${this.t("common.rename")} data-act="rename"
              @click=${()=>this._rename={index:C,name:L.name||""}}><sb-icon .path=${W3}></sb-icon></button>`}
      <button class="icon-btn danger" title=${this.t("common.delete")} aria-label=${this.t("common.delete")} data-act="delete"
        ?disabled=${this.busy} @click=${()=>this._delete(C,L)}><sb-icon .path=${h3}></sb-icon></button>
    </div>`}_typeSelect(C){return i`<label class="field">${this.t("keypad.type")}
      <select data-f="type" @change=${L=>{let e=L.target.value;this._patch({type:e,end:e==="periodic"?"":this._form.end||_2(new Date(Date.now()+q0))})}}>
        ${C.map(L=>i`<option value=${L} ?selected=${this._form.type===L}>${this._typeLabel(L)}</option>`)}
      </select>
    </label>`}_dates(){let C=this._form;return i`<label class="field">${this.t("keypad.valid_from")}
        <input type="datetime-local" data-f="start" .value=${C.start} @input=${L=>this._patch({start:L.target.value})} />
      </label>
      <label class="field">${this.t("keypad.valid_to")}
        <input type="datetime-local" data-f="end" .value=${C.end} @input=${L=>this._patch({end:L.target.value})} />
      </label>`}_nameField(){return i`<label class="field grow">${this.t("keypad.name")}
      <input data-f="name" .value=${this._form.name} placeholder=${this.t("keypad.name_ph")} maxlength="40"
        @input=${C=>this._patch({name:C.target.value})} />
    </label>`}_passcodeForm(){let C=this._form,L=["time_limited","one_time","periodic"].includes(C.type),e=E1(this.hass,"keypad.weekdays");return i`<div class="form">
      <div class="row">
        ${this._nameField()}
        <label class="field">${this.t("keypad.code")}
          <span class="inline">
            <input class="code" data-f="code" .value=${C.code} inputmode="numeric" maxlength="12"
              @input=${r=>this._patch({code:r.target.value})} />
            <button class="icon-btn" title=${this.t("keypad.generate")} aria-label=${this.t("keypad.generate")} data-act="gen"
              @click=${()=>this._patch({code:Z5(Math.max(6,C.code.length))})}><sb-icon .path=${S3}></sb-icon></button>
          </span>
        </label>
      </div>
      <div class="row">${this._typeSelect(x4)} ${L?this._dates():s}</div>
      ${C.type==="periodic"?i`<div class="row days">
              <span class="field">${this.t("keypad.days")}</span>
              ${e.map((r,t)=>i`<label class="day"><input type="checkbox" data-day=${t} .checked=${C.weekdays.includes(t)}
                  @change=${a=>{let M=a.target.checked;this._patch({weekdays:M?[...new Set([...C.weekdays,t])].sort():C.weekdays.filter(n=>n!==t)})}} />${r}</label>`)}
            </div>
            <div class="row">
              <label class="field">${this.t("keypad.hours")}
                <span class="inline">
                  <input type="time" .value=${C.begin} @input=${r=>this._patch({begin:r.target.value})} /> –
                  <input type="time" .value=${C.endTime} @input=${r=>this._patch({endTime:r.target.value})} />
                </span>
              </label>
            </div>`:s}
      <div class="row end">
        <button class="btn" data-act="form-cancel" @click=${()=>this._form=void 0}>${this.t("common.cancel")}</button>
        <button class="btn filled" data-act="passcode-save" ?disabled=${this.busy} @click=${this._savePasscode}>${this.t("common.add")}</button>
      </div>
    </div>`}_cardForm(){let C=this._form;return i`<div class="form">
      <div class="row">${this._nameField()} ${this._typeSelect(u4)}</div>
      ${C.type==="time_limited"?i`<div class="row">${this._dates()}</div>`:s}
      <div class="row end">
        <button class="btn" data-act="form-cancel" @click=${()=>this._form=void 0}>${this.t("common.cancel")}</button>
        <button class="btn filled" data-act="card-start" ?disabled=${this.busy} @click=${this._startCard}>${this.t("common.add")}</button>
      </div>
    </div>`}_nfcView(){let C=this._nfc,L=[];for(let e=0;e<3;e++)for(let r=0;r<3;r++)L.push(d`<circle cx=${20+r*11} cy=${26+e*11} r="3.2" class="key"/>`);return i`<div class="form nfc">
      <svg viewBox="0 0 120 80" class="nfcsvg" aria-hidden="true">
        <rect x="8" y="10" width="46" height="62" rx="6" class="dev"/>
        ${L}
        <rect x="70" y=${C.status==="success"?18:24} width="40" height="28" rx="4" class="nfccard ${C.status||"wait"}"/>
        ${C.status?null:d`<path d="M62 30 q6 10 0 20 M58 26 q10 14 0 28" class="waves"/>`}
      </svg>
      <div>${C.status?this.t(`keypad.nfc_status.${C.status}`):i`${this.t("keypad.nfc_wait")} <span class="secondary">${this.t("keypad.nfc_left",{s:C.left})}</span>`}</div>
      <div class="row end">
        <button class="btn ${C.status==="success"?"filled":""}" data-act="nfc-close" @click=${this._closeNfc}>
          ${C.status==="success"?this.t("common.done"):this.t("common.cancel")}
        </button>
      </div>
    </div>`}_existingForm(){return i`<details class="card existing">
      <summary>${this.t("keypad.existing")}</summary>
      <div class="row">
        <label class="field">${this.t("keypad.index")}
          <input type="number" min="0" max="254" class="narrow" data-f="existing-index" .value=${this._existing.index}
            @input=${C=>this._existing={...this._existing,index:C.target.value}} />
        </label>
        <label class="field grow">${this.t("keypad.name")}
          <input maxlength="40" data-f="existing-name" .value=${this._existing.name}
            @input=${C=>this._existing={...this._existing,name:C.target.value}} />
        </label>
        <button class="btn outlined" data-act="existing" @click=${this._saveExisting}>${this.t("common.save")}</button>
      </div>
    </details>`}};I.styles=[k,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .idx {
        width: 36px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        flex: none;
      }
      .rename {
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .rename input {
        flex: 1;
        min-width: 140px;
      }
      .icon-btn {
        color: var(--secondary-text-color);
      }
      .icon-btn.danger {
        color: var(--error-color, #db4437);
      }
      .form {
        border-top: 1px solid var(--divider-color);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .inline {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      input.code {
        width: 150px;
        letter-spacing: 2px;
        font-variant-numeric: tabular-nums;
      }
      input.narrow {
        width: 90px;
      }
      .days {
        align-items: center;
      }
      label.day {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
      }
      .existing {
        padding: 12px 16px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .existing summary {
        cursor: pointer;
      }
      .existing .row {
        margin-top: 12px;
      }
      .nfc {
        align-items: center;
        text-align: center;
      }
      .nfc .row {
        align-self: stretch;
      }
      .nfcsvg {
        width: 180px;
        height: 120px;
      }
      .nfcsvg .dev { fill: var(--secondary-background-color); stroke: var(--secondary-text-color); stroke-width: 1.5; }
      .nfcsvg .key { fill: var(--secondary-text-color); opacity: .6; }
      .nfcsvg .nfccard { fill: color-mix(in srgb, var(--primary-color) 25%, transparent); stroke: var(--primary-color); stroke-width: 1.5; }
      .nfcsvg .nfccard.success { fill: color-mix(in srgb, var(--success-color, #43a047) 30%, transparent); stroke: var(--success-color, #43a047); }
      .nfcsvg .nfccard.failed, .nfcsvg .nfccard.timeout, .nfcsvg .nfccard.already_exists, .nfcsvg .nfccard.not_dedicated_card { stroke: var(--error-color, #db4437); }
      .nfcsvg .nfccard.wait { animation: tap 1.6s ease-in-out infinite; }
      .nfcsvg .waves { fill: none; stroke: var(--primary-color); stroke-width: 1.5; stroke-linecap: round; opacity: .7; }
      @keyframes tap { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
      @media (prefers-reduced-motion: reduce) { .nfcsvg .nfccard.wait { animation: none; } }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
      }
    `],l([c()],I.prototype,"kind",2),l([v()],I.prototype,"_form",2),l([v()],I.prototype,"_rename",2),l([v()],I.prototype,"_nfc",2),l([v()],I.prototype,"_existing",2),I=l([h("sb-keypad-credentials")],I);var D=class extends S{constructor(){super(...arguments);this.section="status";this._busy=!1;this._op=async(C,L={},{quiet:e=!1}={})=>{e||(this._busy=!0,this._error=void 0,this._msg=void 0);try{let r=await a0(this.hass,this.device.entry_id,C,L);return r.keypad&&(this._keypad=r.keypad),r.result}catch(r){throw this._error=b(r),r}finally{e||(this._busy=!1)}};this._onMessage=C=>{this._msg=C.detail}}connectedCallback(){super.connectedCallback(),this.hass&&!this._sub&&this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),Q(this._sub),this._sub=void 0}firstUpdated(){this._sub||this._subscribe()}willUpdate(C){C.has("section")&&(this._msg=void 0)}_subscribe(){this._sub=o0(this.hass,C=>{let L=C.keypads.find(e=>e.entry_id===this.device.entry_id);L&&(this._keypad=L)})}render(){let C=this._keypad;if(!C)return i`<div class="card"><div class="card-content busy"><span class="spinner"></span>${this.t("common.loading")}</div></div>`;let L={hass:this.hass,keypad:C,op:this._op,busy:this._busy};return i`
      ${this._feedback()}
      ${this.section==="status"?i`<sb-keypad-status .hass=${L.hass} .keypad=${C} .op=${this._op} .busy=${this._busy}
            @keypad-message=${this._onMessage}></sb-keypad-status>`:i`<sb-keypad-credentials .hass=${L.hass} .keypad=${C} .op=${this._op} .busy=${this._busy}
            .kind=${this.section} @keypad-message=${this._onMessage}></sb-keypad-credentials>`}
    `}_feedback(){return this._busy?i`<div class="alert"><span class="spinner"></span><div class="text">${this.t("keypad.busy")}</div></div>`:this._error?i`<div class="alert error"><sb-icon .path=${g1}></sb-icon><div class="text">${this._error}</div></div>`:this._msg?i`<div class="alert success"><sb-icon .path=${c3}></sb-icon><div class="text">${this._msg}</div></div>`:s}};D.styles=[k,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--secondary-text-color);
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
      }
    `],l([c({attribute:!1})],D.prototype,"device",2),l([c()],D.prototype,"section",2),l([v()],D.prototype,"_keypad",2),l([v()],D.prototype,"_busy",2),l([v()],D.prototype,"_error",2),l([v()],D.prototype,"_msg",2),D=l([h("sb-keypad-view")],D);var Y0=["lock","cover","light","fan","humidifier","vacuum","climate","switch","button","select","number"],w1=class extends S{render(){let V=c1(this.hass,this.device),C=V.filter(r=>r.category===null&&Y0.includes(r.domain)),L=V.filter(r=>r.category===null&&!Y0.includes(r.domain)),e=V.filter(r=>r.category==="diagnostic");return i`
      ${this.device.features.keypad?i`<sb-keypad-view .hass=${this.hass} .device=${this.device} section="status"></sb-keypad-view>`:s}
      ${this._card("overview.controls",C)} ${this._card("overview.status",L)}
      ${this._card("overview.diagnostics",e)}
      ${V.length?s:i`<div class="card"><div class="card-content">${this.t("common.no_entities")}</div></div>`}
    `}_card(V,C){return C.length?i`<section class="card">
      <h2 class="card-header">${this.t(V)}</h2>
      <div class="list">
        ${C.map(L=>i`<sb-entity-row .hass=${this.hass} .device=${this.device} .entity=${L}></sb-entity-row>`)}
      </div>
    </section>`:s}};w1.styles=[k,t1,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2.card-header {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        padding-bottom: 0;
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
      }
    `],l([c({attribute:!1})],w1.prototype,"device",2),w1=l([h("sb-device-overview")],w1);var f5=["switch","select","number","time","button"],O1=class extends S{render(){let V=c1(this.hass,this.device).filter(L=>L.category==="config"&&f5.includes(L.domain)),C=L=>/_(start|from)$/.test(L)?0:/_(end|to)$/.test(L)?1:0;return V.sort((L,e)=>f5.indexOf(L.domain)-f5.indexOf(e.domain)||C(L.entity_id)-C(e.entity_id)),i`<div class="card">
      ${V.length?i`<div class="list">
            ${V.map(L=>i`<sb-entity-row .hass=${this.hass} .device=${this.device} .entity=${L}></sb-entity-row>`)}
          </div>`:i`<div class="card-content">${this.t("settings.none")}</div>`}
      <div class="card-actions">
        <span class="sub hint"><sb-icon .path=${a2} .size=${16}></sb-icon> ${this.t("settings.note")}</span>
        <span class="spacer"></span>
      </div>
    </div>`}};O1.styles=[k],l([c({attribute:!1})],O1.prototype,"device",2),O1=l([h("sb-entity-settings")],O1);var y2={temperature:{unit:"\xB0C",step:.1,decimals:1},humidity:{unit:"%",step:.1,decimals:1},co2:{unit:"ppm",step:10,decimals:0}};function g5(H,V,C){let L=H.values[V],e=y2[V],r=H.device_calibration&&(V==="temperature"||V==="humidity"),t=Z=>({...Z,corrected:typeof Z.base=="number"&&Z.value!==null&&!Number.isNaN(Z.value)?Z.base+Z.value:null});if(!r){let Z=L.offset,h1=C!==void 0?Number(C):Z;return t({onDevice:r,step:e.step,dec:e.decimals,offDec:e.decimals===0?0:1,base:L.raw,stored:Z,value:h1,ready:!0,dirty:C!==void 0&&Number(C)!==Z})}let a=V==="humidity"?1:.1,M=V==="humidity"?0:1,n=H.device_calibration_value;if(!n)return t({onDevice:r,step:a,dec:e.decimals,offDec:M,base:null,stored:null,value:null,ready:!1,dirty:!1});let A=Z=>Math.round(Z/a)*a,p=n[V],m=C!==void 0?A(Number(C)):p,x=typeof L.raw=="number"?L.raw-p:null;return t({onDevice:r,step:a,dec:e.decimals,offDec:M,base:x,stored:p,value:m,ready:!0,dirty:Math.abs(m-p)>1e-9})}var X0=(H,[V,C])=>Math.max(V,Math.min(C,H)),b2=H=>Math.round(H*100)/100;var h4={temperature:p2,humidity:y1,co2:D3},B=class extends S{constructor(){super(...arguments);this.offsetLimits={};this._drafts={};this._refs={};this._flash={};this._busy=!1;this._autoRead=!1}connectedCallback(){super.connectedCallback(),this.hass&&!this._sub&&this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),Q(this._sub),this._sub=void 0}firstUpdated(){this._sub||this._subscribe()}_subscribe(){this._sub=L0(this.hass,C=>{let L=C.sensors.find(e=>e.entry_id===this.device.entry_id);L&&(this._sensor=L,L.device_calibration&&!L.device_calibration_value&&!this._autoRead&&(this._autoRead=!0,this._deviceCall({action:"read"})))})}_limits(C){return this.offsetLimits[C]??[-100,100]}async _deviceCall(C,L){this._busy=!0,this._error=void 0;try{let e=await r0(this.hass,this.device.entry_id,C);this._sensor=e.sensor,L&&this._afterSave(L)}catch(e){this._error=b(e)}finally{this._busy=!1}}_afterSave(C){let{[C]:L,...e}=this._drafts;this._drafts=e,this._flash={...this._flash,[C]:!0},setTimeout(()=>this._flash={...this._flash,[C]:!1},2500)}async _save(C,L){let e=this._sensor;if(g5(e,C,void 0).onDevice){let r=C==="humidity"?Math.round(L):Math.round(L*10)/10;await this._deviceCall({action:"set",[C]:r},C);return}this._busy=!0,this._error=void 0;try{let r=await e0(this.hass,e.entry_id,C,L);this._sensor=r.sensor,this._afterSave(C)}catch(r){this._error=b(r)}finally{this._busy=!1}}_setDraft(C,L){this._drafts={...this._drafts,[C]:String(X0(L,this._limits(C)))},this._flash={...this._flash,[C]:!1}}render(){let C=this._sensor;if(!C)return i`<div class="card"><div class="card-content waiting"><span class="spinner"></span>${this.t("sensor.waiting")}</div></div>`;let L=Object.keys(y2).filter(e=>C.values[e]);return i`${this._summary(C)} ${L.map(e=>this._row(C,e))}`}_summary(C){return i`<section class="card">
      <div class="card-content">
        <p class="intro">${this.t(C.device_calibration?"sensor.devcal_intro":"sensor.intro")}</p>
        ${this._error?i`<div class="alert error"><sb-icon .path=${F}></sb-icon><div class="text">${this._error}</div></div>`:s}
      </div>
      ${C.device_calibration?i`<div class="card-actions">
            ${this._busy?i`<span class="busy"><span class="spinner"></span>${this.t("sensor.devcal_busy")}</span>`:s}
            <span class="spacer"></span>
            <button class="btn" data-act="devcal-read" ?disabled=${this._busy} @click=${()=>this._deviceCall({action:"read"})}>
              <sb-icon .path=${l2} .size=${18}></sb-icon>${this.t("common.read")}
            </button>
          </div>`:s}
    </section>`}_row(C,L){let e=y2[L],r=C.values[L],t=g5(C,L,this._drafts[L]),a=this._limits(L),M=!t.ready||t.onDevice&&this._busy,n=this._refs[L]??"",A=i`<span class="u">${e.unit}</span>`,p=this.t("sensor.limit",{min:a[0],max:a[1]})+(t.onDevice&&L==="humidity"?` \xB7 ${this.t("sensor.whole_percent")}`:"");return i`<section class="card corr-row" data-key=${L}>
      <div class="card-header">
        <sb-icon class="hdr-icon" .path=${h4[L]}></sb-icon>
        <div class="hdr-text">
          <span>${this.t(`sensor.${L}`)}</span>
          ${r.entity_id?i`<span class="eid">${r.entity_id}</span>`:s}
        </div>
        ${t.onDevice?i`<span class="tag"><sb-icon .path=${x3} .size=${14}></sb-icon>${this.t("sensor.stored_in_sensor")}</span>`:s}
      </div>
      <div class="list">
        <div class="item">
          <span class="text"><span class="headline">${this.t(t.onDevice?"sensor.raw_device":"sensor.raw")}</span></span>
          <span class="value"><span data-f="raw">${t2(t.base,e.decimals)}</span>${A}</span>
        </div>
        <div class="item">
          <span class="text">
            <span class="headline">${this.t(t.onDevice?"sensor.offset_device":"sensor.offset")}</span>
            <span class="supporting">${p}</span>
          </span>
          <div class="stepper">
            <button class="icon-btn" data-step="-1" ?disabled=${M} aria-label="−"
              @click=${()=>this._setDraft(L,b2((t.value??0)-t.step))}><sb-icon .path=${d2} .size=${20}></sb-icon></button>
            <input type="number" inputmode="decimal" data-f="offset" step=${t.step} min=${a[0]} max=${a[1]}
              .value=${t.value===null?"":t2(t.value,t.offDec)} ?disabled=${M}
              @input=${m=>{let x=m.target.value;x!==""&&!Number.isNaN(Number(x))&&this._setDraft(L,Number(x))}} />
            <button class="icon-btn" data-step="1" ?disabled=${M} aria-label="+"
              @click=${()=>this._setDraft(L,b2((t.value??0)+t.step))}><sb-icon .path=${_1} .size=${20}></sb-icon></button>
          </div>
        </div>
        <div class="item">
          <span class="text">
            <span class="headline">${this.t("sensor.reference")}</span>
            <span class="supporting">${this.t("sensor.reference_hint")}</span>
          </span>
          <div class="ref">
            <input type="number" inputmode="decimal" data-f="ref" step=${e.step} .value=${n} ?disabled=${!t.ready}
              aria-label=${this.t("sensor.reference")} placeholder=${e.unit}
              @input=${m=>this._refs={...this._refs,[L]:m.target.value}} />
            <button class="btn" data-act="ref" ?disabled=${M||n===""||typeof t.base!="number"}
              @click=${()=>this._setDraft(L,b2(Number(n)-t.base))}>${this.t("sensor.apply_ref")}</button>
          </div>
        </div>
        <div class="item result">
          <span class="text"><span class="headline">${this.t(t.onDevice?"sensor.result_device":"sensor.result")}</span></span>
          <span class="value ${t.dirty?"dirty":""}"><span data-f="result">${t2(t.corrected,e.decimals)}</span>${A}</span>
        </div>
      </div>
      <div class="card-actions">
        ${this._flash[L]?i`<span class="ok-text">${this.t(t.onDevice?"sensor.saved_device":"sensor.saved")}</span>`:s}
        <span class="spacer"></span>
        <button class="btn" data-act="reset" ?disabled=${M||t.value===0&&!t.dirty} @click=${()=>this._save(L,0)}>
          ${this.t("common.reset")}
        </button>
        <button class="btn filled" data-act="save" ?disabled=${!t.dirty||M} @click=${()=>this._save(L,t.value??0)}>
          ${this.t(t.onDevice?"sensor.save_device":"common.save")}
        </button>
      </div>
    </section>`}};B.styles=[k,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .waiting,
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      .alert {
        margin-top: 12px;
      }
      .card-header {
        padding-bottom: 8px;
      }
      .hdr-icon {
        color: var(--state-icon-color, var(--secondary-text-color));
        margin-right: 8px;
      }
      .hdr-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .eid {
        font-size: 12px;
        line-height: 16px;
        color: var(--secondary-text-color);
        font-family: var(--ha-font-family-code, monospace);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        color: var(--primary-color);
        white-space: nowrap;
      }
      .list {
        padding: 0;
      }
      .corr-row .list {
        border-top: 1px solid var(--divider-color);
      }
      .item {
        min-height: 64px;
      }
      .value {
        font-size: 16px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .u {
        margin-left: 4px;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      .result .value {
        font-size: 20px;
        font-weight: 500;
      }
      .result .value.dirty,
      .result .value.dirty .u {
        color: var(--primary-color);
      }
      .stepper,
      .ref {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: none;
      }
      .stepper .icon-btn {
        color: var(--primary-color);
      }
      .stepper input {
        width: 80px;
        text-align: center;
      }
      .ref input {
        width: 104px;
        text-align: center;
      }
      .ok-text {
        font-size: 14px;
      }
      @media (max-width: 520px) {
        .item:has(.stepper),
        .item:has(.ref) {
          flex-wrap: wrap;
          gap: 8px;
        }
        .item:has(.stepper) .text,
        .item:has(.ref) .text {
          flex-basis: 100%;
        }
        .stepper,
        .ref {
          margin-left: auto;
        }
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
      }
    `],l([c({attribute:!1})],B.prototype,"device",2),l([c({attribute:!1})],B.prototype,"offsetLimits",2),l([v()],B.prototype,"_sensor",2),l([v()],B.prototype,"_drafts",2),l([v()],B.prototype,"_refs",2),l([v()],B.prototype,"_flash",2),l([v()],B.prototype,"_busy",2),l([v()],B.prototype,"_error",2),B=l([h("sb-sensor-correction")],B);var w2=H=>Math.PI/180*H;function S4(H,V,C){return d`<g class="padlock" transform="translate(${H} ${V})">
    <path d=${C?"M-5 -1 v-7 a5 5 0 0 1 10 0 v-2":"M-5 -1 v-6 a5 5 0 0 1 10 0 v6"} class="shackle"
      transform=${C?"translate(-4 -2)":""}/>
    <rect x="-8" y="-1" width="16" height="13" rx="2.5" class="lockbody"/>
  </g>`}function C7(H,V,C,L=!1){return H?d`<g class="bubble" transform="translate(${V} ${C})">
    <g transform=${L?"translate(64 0) scale(-1 1)":""}>
      <path d="M20 0 h24 a20 20 0 0 1 0 40 h-4 l14 14 l-26 -14 h-8 a20 20 0 0 1 0 -40 z"/>
    </g>
    ${S4(32,16,H==="unlocked")}
  </g>`:null}function G1(H,V,C=11){return d`<g class="badge"><circle cx=${H} cy=${V} r=${C}/>
    <path d="M${H} ${V-C*.5} v${C*.55} M${H} ${V+C*.45} v0.5"/></g>`}function J0(H,V,C){return d`<g class="marker"><circle cx=${V} cy=${C} r="8"/><text x=${V} y=${C+4}>${H}</text></g>`}function f4(H,V){return d`<g class="hand" transform="translate(${H-196} ${V-96})">
    <path d="M330 150 C300 140 268 126 250 116 C238 110 226 102 214 98 C204 94 194 92 189 98 C185 104 191 110 199 112
      C194 117 193 124 199 128 C195 134 199 140 207 141 C205 147 212 152 222 150 C238 156 262 172 296 206 L330 206 Z"/>
    <path d="M199 112 C209 112 217 115 223 120 M199 128 C209 128 217 130 224 134 M207 141 C213 141 219 143 225 146" class="fingers"/>
  </g>`}function g4(H,V){return d`<g class="hand" transform="translate(${H} ${V})">
    <path d="M-40 70 C-30 50 -20 36 -8 26 L-14 -4 C-15 -9 -8 -11 -6 -6 L2 16 L0 -14 C0 -19 7 -19 7 -14 L10 14 L14 -12
      C15 -17 22 -16 21 -11 L18 16 L25 -4 C27 -9 33 -7 32 -2 L24 30 C22 42 16 52 8 60 L0 70 Z"/>
  </g>`}function k4(H,V,C){let L=H?{x:138,y:38,w:50,h:142,r:25,kx:210,ky:94,krx:12,kry:27,base:176}:{x:142,y:46,w:40,h:124,r:20,kx:196,ky:96,krx:10,kry:22,base:166},e=V??0,r=L.kx+L.krx*.62*Math.sin(w2(e)),t=L.ky-L.kry*.72*Math.cos(w2(e));return{art:d`<g class="lock ${H?"max":"ultra"}">
    <rect x=${L.x-7} y=${L.y+4} width=${L.w} height=${L.h} rx=${L.r} class="body-back"/>
    <rect x=${L.x} y=${L.y} width=${L.w} height=${L.h} rx=${L.r} class="body"/>
    ${H?d`<path d="M${L.x+8} ${L.y+L.h-34} h${L.w-16}" class="seam"/>
            <ellipse cx=${L.base+6} cy=${L.ky} rx=${L.krx} ry=${L.kry+5} class="shoulder"/>`:d`<circle cx=${L.x+L.w/2} cy=${L.y+L.h-18} r="2.5" class="led"/>`}
    <path d="M${L.base} ${L.ky-L.kry} H${L.kx} V${L.ky+L.kry} H${L.base} Z" class="knob-side"/>
    <ellipse cx=${L.base} cy=${L.ky} rx=${L.krx*.8} ry=${L.kry} class="knob-side"/>
    <ellipse cx=${L.kx} cy=${L.ky} rx=${L.krx} ry=${L.kry} class="knob-face"/>
    <circle cx=${r} cy=${t} r="2.6" class="knob-dot"/>
    ${C?G1(L.kx+18,L.ky-L.kry-6):null}
  </g>`,kx:L.kx,ky:L.ky}}function H7(H,V,C,L,e){return d`<circle cx=${H} cy=${V} r=${C} class="disc"/>
    <g class="needle" style="transform: rotate(${e??0}deg); transform-origin: ${H}px ${V}px">
      <rect x=${H-L/5} y=${V-L/2} width=${L*2/5} height=${L} rx="2.5" class="bar"/>
      <rect x=${H-L/5+1.5} y=${V-L/2+2} width="2.5" height=${L-4} rx="1.2" class="bar-shine"/>
    </g>`}function _4(H,V){return{art:d`<g class="lock classic">
    <ellipse cx="124" cy="140" rx="6" ry="19" class="rosette"/>
    <g class="coupler">
      <path d="M124 124 H140 V156 H124 Z" class="cup"/>
      <path d="M124 124 l5 -5 h11 v5 M124 156 l5 5 h11 v-5" class="jaw"/>
      <path d="M130 128 v24 M135 128 v24" class="cup-line"/>
    </g>
    <rect x="130" y="36" width="50" height="78" rx="7" class="body-back"/>
    <path d="M136 52 h-4 M136 96 h-4" class="seam"/>
    <rect x="138" y="40" width="54" height="140" rx="9" class="body"/>
    <path d="M144 72 h42" class="seam"/>
    <path d="M158 60 h14" class="bslot"/>
    <circle cx="165" cy="98" r="2.2" class="led"/>
    ${H7(165,140,21,40,H)}
    ${V?G1(196,44):null}
  </g>`,kx:182,ky:152}}function y4(H,V){return{art:d`<g class="lock lite">
    <rect x="140" y="48" width="38" height="124" rx="13" class="body-back"/>
    <rect x="146" y="44" width="38" height="124" rx="13" class="body"/>
    ${H7(165,80,14,26,H)}
    <circle cx="165" cy="140" r="2.2" class="led"/>
    ${V?G1(188,46):null}
  </g>`,kx:178,ky:90}}function b4(H,V){return H==="lock"?_4(V.knob,!!V.blocked):H==="lock_lite"?y4(V.knob,!!V.blocked):k4(H==="lock_ultra_max",V.knob,!!V.blocked)}function w4(H,V){let C=V.door==="ajar"?36:V.door==="open"?70:V.door==="against"?34:0,L=Math.max(0,Math.min(1,V.bolt)),e=30*L,{art:r,kx:t,ky:a}=b4(H,V),M=L>.02?d`<g class="bolt-g ${V.markers?"hl":""}">
          <path d="M${99-e} 100 l6 -6 h${12+e} l-6 6 z" class="bolt-top"/>
          <rect x=${99-e} y="100" width=${12+e} height="20" class="bolt"/>
        </g>`:d`<rect x="101" y="100" width="8" height="20" rx="2" class="slot"/>`,n=V.nightLatch?d`<g class="latch-g ${V.markers?"hl":""}">
        <path d="M85 70 h26 v22 h-26 a6 11 0 0 1 0 -22 z" class="latch"/>
        <path d="M86 77 h24 M86 85 h24" class="latch-line"/>
      </g>`:null;return d`<svg viewBox="0 0 320 200" class="scene edge ${V.moving?"moving":""} ${V.blocked?"blocked":""}" role="img">
    <rect x="0" y="0" width="64" height="200" class="wall"/>
    <rect x="64" y="0" width="20" height="200" class="jamb"/>
    <rect x="84" y="0" width="8" height="200" class="jamb-lip"/>
    <rect x="84" y="99" width="8" height="22" class="strike"/>
    ${V.nightLatch?d`<rect x="84" y="69" width="8" height="24" class="strike"/>`:null}
    ${V.magnet?d`<g class="magnet-g"><rect x="70" y="28" width="12" height="30" rx="3" class="magnet"/>
        <path d="M70 36 h12" class="magnet-line"/></g>`:null}
    ${C?d`<rect x="92" y="0" width=${C} height="200" class="gap"/>`:null}
    <g class="door-g" style="transform: translateX(${C}px)">
      <rect x="94" y="-2" width="22" height="204" class="door-edge"/>
      <rect x="99" y="10" width="12" height="180" rx="6" class="faceplate"/>
      <circle cx="105" cy="24" r="2.4" class="screw"/><circle cx="105" cy="176" r="2.4" class="screw"/>
      ${n}
      ${M}
      <rect x="116" y="-2" width="220" height="204" class="door"/>
      ${r}
      ${V.hand?f4(t,a):null}
    </g>
    ${V.door==="ajar"?d`<text x=${92+C/2} y="194" class="gap-label">≈10 cm</text>`:null}
    ${V.markers?d`${J0(1,40,81)}${J0(2,40,110)}`:null}
    ${C7(V.bubble,6,18)}
  </svg>`}function O4(H){let V=H.door==="ajar"?28:H.door==="open"?60:0,C=Math.max(0,Math.min(1,H.bolt)),L=H.knob??0;return d`<svg viewBox="0 0 320 200" class="scene pro ${H.moving?"moving":""} ${H.blocked?"blocked":""}" role="img">
    <rect x="0" y="0" width="222" height="200" class="door"/>
    <line x1="222" y1="0" x2="222" y2="200" class="door-line"/>
    ${V?d`<rect x="223" y="0" width=${V} height="200" class="gap"/>`:null}
    ${V&&C>.02?d`<rect x="222" y="94" width=${Math.min(V-2,22*C+4)} height="18" rx="2" class="bolt"/>`:null}
    <g style="transform: translateX(${V}px)" class="door-g">
      <rect x="224" y="0" width="12" height="200" class="jamb-lip"/>
      <rect x="236" y="0" width="100" height="200" class="wall"/>
      ${H.magnet?d`<rect x="226" y="38" width="9" height="26" rx="2" class="magnet"/>`:null}
    </g>
    <g class="lock pro">
      <rect x="118" y="44" width="54" height="116" rx="9" class="body"/>
      <rect x="124" y="50" width="42" height="104" rx="6" class="body-inner"/>
      <circle cx="145" cy="80" r="17" class="knob-face"/>
      <g class="needle" style="transform: rotate(${L}deg); transform-origin: 145px 80px">
        <rect x="141" y="65" width="8" height="30" rx="4" class="grip"/>
      </g>
      <circle cx="145" cy="112" r="3" class="led"/>
      <path d="M124 128 h42" class="seam"/>
      ${H.blocked?G1(170,50):null}
    </g>
    ${H.hand&&H.door==="ajar"?g4(70,130):null}
    ${H.door==="ajar"?d`<text x=${222+V/2} y="194" class="gap-label">≈10 cm</text>`:null}
    ${C7(H.bubble,238+V,24,!0)}
  </svg>`}function V7(H,V){return H==="lock_pro"?O4(V):w4(H,V)}function L7(H){let V=H==="lock"?d`<rect x="58" y="14" width="84" height="172" rx="14" class="jam-body"/>
          <path d="M68 52 h64" class="jam-seam"/><circle cx="100" cy="90" r="3.5" class="jam-dot"/>
          <circle cx="100" cy="136" r="32" class="jam-knob"/><rect x="93" y="108" width="14" height="56" rx="3" class="jam-bar"/>`:H==="lock_lite"?d`<rect x="70" y="14" width="60" height="172" rx="22" class="jam-body light"/>
            <circle cx="100" cy="62" r="22" class="jam-knob light"/><rect x="95" y="44" width="10" height="36" rx="3" class="jam-bar"/>
            <circle cx="100" cy="130" r="3.5" class="jam-dot"/>`:H==="lock_pro"?d`<rect x="62" y="20" width="76" height="160" rx="12" class="jam-body"/>
          <circle cx="100" cy="68" r="24" class="jam-knob"/><rect x="95" y="48" width="10" height="40" rx="5" class="jam-grip"/>
          <circle cx="100" cy="118" r="4" class="jam-dot"/>`:H==="lock_ultra_max"?d`<rect x="56" y="8" width="88" height="184" rx="44" class="jam-body light"/>
            <circle cx="100" cy="122" r="36" class="jam-knob light"/>`:d`<rect x="64" y="14" width="72" height="172" rx="36" class="jam-body"/>
            <circle cx="100" cy="126" r="30" class="jam-knob"/><circle cx="100" cy="106" r="3.5" class="jam-dot"/>`;return d`<svg viewBox="0 0 200 200" class="jam" role="img">${V}${G1(138,164,18)}</svg>`}function O2(H){return d`<svg viewBox="0 0 160 110" class="latchtype" role="img">
    <rect x="30" y="0" width="16" height="110" class="door-edge"/>
    <rect x="34" y="6" width="9" height="98" rx="4.5" class="faceplate"/>
    <rect x="46" y="0" width="120" height="110" class="door"/>
    ${H?d`<path d="M22 34 h21 v18 h-21 a5 9 0 0 1 0 -18 z" class="latch"/>
          <path d="M23 40 h20 M23 46 h20" class="latch-line"/>
          <path d="M20 62 l5 -5 h18 l-5 5 z" class="bolt-top"/><rect x="20" y="62" width="23" height="16" class="bolt"/>
          <circle cx="100" cy="60" r="14" class="cyl"/><path d="M100 60 h26 v6 h-6 v4 h-6 v-4 h-14 z" class="key"/>
          <circle cx="100" cy="60" r="5" class="cyl-in"/>`:d`<path d="M24 46 h19 v18 h-19 l-6 -9 z" class="latch"/>
          <circle cx="84" cy="56" r="9" class="cyl"/>
          <path d="M84 50 h44 a8 8 0 0 1 0 14 h-44" class="handle"/>`}
  </svg>`}function e7(H){return H?d`<svg viewBox="0 0 120 120" class="result ok"><circle cx="60" cy="60" r="52"/><path d="M36 62 l16 16 l32 -36"/></svg>`:d`<svg viewBox="0 0 120 120" class="result bad"><path d="M60 12 L112 104 H8 Z"/><path d="M60 46 v28 M60 88 v2"/></svg>`}function r7({model:H="lock_ultra",angle:V,marks:C=[],moving:L=!1,arrow:e}){let a=[];for(let A=0;A<360;A+=15){let p=A%90===0;a.push(d`<line x1=${110} y1=${110-(p?78:83)} x2=${110} y2=${20} transform="rotate(${A} ${110} ${110})"
        class="tick ${p?"long":""}"/>`)}let M=H==="lock"?d`<rect x=${44} y=${44} width="132" height="132" rx="16" class="plate"/>
          <circle cx=${110} cy=${110} r="56" class="body"/>`:H==="lock_lite"?d`<rect x=${56} y=${40} width="108" height="140" rx="40" class="plate"/>
            <circle cx=${110} cy=${110} r="48" class="body"/>`:H==="lock_pro"?d`<rect x=${52} y=${44} width="116" height="132" rx="14" class="plate"/>
          <circle cx=${110} cy=${110} r="50" class="body"/>`:H==="lock_ultra_max"?d`<circle cx=${110} cy=${110} r="72" class="plate"/><circle cx=${110} cy=${110} r="60" class="body"/>`:d`<circle cx=${110} cy=${110} r="62" class="body"/>`,n=H==="lock"||H==="lock_lite"?d`<rect x=${100} y=${62} width="20" height="96" rx="4" class="grip bar"/>`:H==="lock_pro"?d`<rect x=${103} y=${66} width="14" height="88" rx="7" class="grip"/>`:H==="lock_ultra_max"?d`<rect x=${99} y=${58} width="22" height="104" rx="11" class="grip"/>`:d`<rect x=${101} y=${54} width="18" height="112" rx="9" class="grip"/>`;return d`<svg viewBox="0 0 220 220" class="dial ${L?"moving":""}" role="img">
    <circle cx=${110} cy=${110} r="96" class="ring"/>
    ${a}
    ${C.map(A=>d`<g transform="rotate(${A.angle} ${110} ${110})">
        <path d="M${104} ${8} L${116} ${8} L${110} ${18} Z" class="mark ${A.cls}"/>
      </g>`)}
    ${M}
    <g class="needle" style="transform: rotate(${V??0}deg); transform-origin: ${110}px ${110}px">
      ${n}
      <circle cx=${110} cy=${110-(H==="lock_pro"?34:40)} r="4" class="dot"/>
    </g>
    ${e?d`<g class="turn" transform=${e==="ccw"?`translate(${2*110} 0) scale(-1 1)`:""}>
          <path d="M168 52 a70 70 0 0 1 22 40" class="turn-arrow"/><path d="M186 86 l5 9 l6 -9" class="turn-arrow"/>
        </g>`:null}
  </svg>`}function t7(H){let V=`${56+148*Math.cos(w2(-H))} ${135+148*Math.sin(w2(-H))}`;return d`<svg viewBox="0 0 260 180" class="doorsvg" role="img">
    <rect x="16" y="120" width="40" height="30" class="frame"/>
    <rect x="204" y="120" width="40" height="30" class="frame"/>
    <path d="M56 135 A148 148 0 0 1 ${V}" class="swing"/>
    ${H?d`<text x="214" y="86" class="gap">≈10 cm</text>`:null}
    <g style="transform: rotate(${-H}deg); transform-origin: 56px 135px; transition: transform .8s ease">
      <rect x="56" y="128" width="148" height="14" rx="2" class="leaf"/>
      <rect x="168" y="118" width="24" height="10" rx="2" class="housing"/>
    </g>
    <rect x="200" y="112" width="10" height="8" class="magnet"/>
  </svg>`}var M7=u`
  :host {
    --art-line: var(--primary-text-color);
    --art-paper: var(--card-background-color);
    --art-shade: color-mix(in srgb, var(--primary-text-color) 10%, var(--card-background-color));
    --art-dark: color-mix(in srgb, var(--primary-text-color) 72%, var(--card-background-color));
    --art-accent: #f39a1e;
    --art-bubble-edge: color-mix(in srgb, var(--primary-text-color) 35%, transparent);
  }
  .art {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border-radius: 12px;
    background: var(--secondary-background-color);
  }
  .art.single {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .art svg {
    width: 100%;
    max-height: 230px;
  }
  .art.single svg {
    max-width: 260px;
  }
  @media (max-width: 520px) {
    .art {
      grid-template-columns: 1fr;
    }
    .art .dial {
      max-height: 160px;
    }
  }

  /* scenes */
  .scene .wall { fill: var(--secondary-background-color); }
  .scene .jamb { fill: #5b626c; }
  .scene .jamb-lip { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.2; }
  .scene .strike { fill: var(--art-dark); opacity: .55; }
  .scene .gap { fill: var(--art-dark); opacity: .25; }
  .scene .door-g { transition: transform .8s ease; }
  .scene .door, .latchtype .door { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .door-line { stroke: var(--art-line); stroke-width: 2.5; }
  .scene .door-edge, .latchtype .door-edge { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .faceplate, .latchtype .faceplate { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .screw { fill: none; stroke: var(--art-line); stroke-width: 1; }
  .scene .bolt, .latchtype .bolt { fill: var(--art-accent); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .bolt-top, .latchtype .bolt-top { fill: color-mix(in srgb, var(--art-accent) 60%, #fff); stroke: var(--art-line); stroke-width: 1.2; }
  .scene .slot { fill: none; stroke: var(--art-accent); stroke-width: 2.2; }
  .scene .latch, .latchtype .latch { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .latch-line, .latchtype .latch-line { stroke: var(--art-line); stroke-width: 1.2; }
  .scene .latch-g.hl .latch { fill: color-mix(in srgb, var(--art-accent) 55%, var(--art-paper)); }
  .scene .magnet, .doorsvg .magnet { fill: var(--primary-color); }
  .scene .magnet-line { stroke: var(--art-paper); stroke-width: 1.5; }
  .scene .body { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 2; }
  .scene .body-back { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .body-inner { fill: none; stroke: var(--art-line); stroke-width: 1; opacity: .6; }
  .scene .seam { stroke: var(--art-line); stroke-width: 1; opacity: .6; }
  .scene .led { fill: var(--primary-color); }
  .scene .shoulder { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .knob-side { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .knob-face { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 2; }
  .scene .knob-dot { fill: var(--primary-color); }
  .scene .grip { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .disc { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .bar { fill: color-mix(in srgb, var(--art-line) 22%, var(--art-paper)); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .bar-shine { fill: var(--art-paper); opacity: .8; }
  .scene .rosette { fill: color-mix(in srgb, var(--art-line) 30%, var(--art-paper)); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .cup { fill: color-mix(in srgb, var(--art-line) 45%, var(--art-paper)); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .jaw { fill: none; stroke: var(--art-line); stroke-width: 1.6; stroke-linejoin: round; }
  .scene .cup-line { stroke: var(--art-paper); stroke-width: 1; opacity: .6; }
  .scene .bslot { stroke: var(--art-line); stroke-width: 2; stroke-linecap: round; opacity: .7; }
  .scene .needle { transition: transform .5s ease; }
  .scene.moving .needle { transition: transform .25s linear; }
  .scene .hand path { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.6; stroke-linejoin: round; }
  .scene .hand .fingers { fill: none; stroke-width: 1.2; }
  .scene .bubble > g > path { fill: #333a44; stroke: var(--art-bubble-edge, transparent); stroke-width: 1.5; }
  .scene .padlock .lockbody { fill: #fff; }
  .scene .padlock .shackle { fill: none; stroke: #fff; stroke-width: 2.6; stroke-linecap: round; }
  .scene .marker circle { fill: #333a44; stroke: var(--art-bubble-edge, transparent); stroke-width: 1.2; }
  .scene .marker text { fill: #fff; font: 700 11px Roboto, sans-serif; text-anchor: middle; }
  .scene .gap-label { fill: var(--primary-color); font: 600 12px Roboto, sans-serif; text-anchor: middle; }
  .scene.blocked .bolt { fill: var(--error-color, #db4437); }
  .scene.moving .bolt, .scene.moving .slot { animation: pulse .8s ease-in-out infinite; }
  .badge circle { fill: var(--error-color, #db4437); }
  .badge path { stroke: #fff; stroke-width: 3; stroke-linecap: round; }
  @keyframes pulse { 50% { opacity: .5; } }

  /* jam */
  .jam { width: 160px; height: 160px; }
  .jam .jam-body { fill: #4a5059; }
  .jam .jam-body.light { fill: #8e98a3; }
  .jam .jam-knob { fill: #3b4048; stroke: #6b737d; stroke-width: 3; }
  .jam .jam-knob.light { fill: #d9dde1; stroke: none; }
  .jam .jam-grip { fill: #6b737d; }
  .jam .jam-bar { fill: #c3c8ce; stroke: #6b737d; stroke-width: 1.5; }
  .jam .jam-seam { stroke: #6b737d; stroke-width: 2; }
  .jam .jam-dot { fill: var(--error-color, #db4437); }

  /* lock type */
  .latchtype { width: 100%; max-width: 160px; align-self: center; }
  .latchtype .cyl { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.4; }
  .latchtype .cyl-in { fill: none; stroke: var(--art-line); stroke-width: 1.2; }
  .latchtype .key { fill: var(--art-accent); stroke: var(--art-line); stroke-width: 1.2; }
  .latchtype .handle { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.6; }

  /* dial */
  .dial .ring { fill: none; stroke: var(--divider-color); stroke-width: 2; }
  .dial .tick { stroke: var(--secondary-text-color); stroke-width: 1.2; opacity: .5; }
  .dial .tick.long { stroke-width: 2; opacity: .9; }
  .dial .plate { fill: var(--secondary-background-color); stroke: var(--primary-text-color); stroke-width: 1.5; }
  .dial .body { fill: var(--card-background-color); stroke: var(--primary-text-color); stroke-width: 2.5; }
  .dial .needle { transition: transform .5s ease; }
  .dial .grip { fill: var(--secondary-background-color); stroke: var(--primary-text-color); stroke-width: 2.5; }
  .dial .grip.bar { fill: color-mix(in srgb, var(--primary-text-color) 22%, var(--card-background-color)); }
  .dial .dot { fill: var(--primary-color); }
  .dial .mark.lockmark { fill: var(--primary-color); }
  .dial .turn-arrow { fill: none; stroke: var(--primary-color); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .dial.moving .needle { transition: transform .25s linear; }

  /* door from above */
  .doorsvg .frame { fill: var(--secondary-text-color); opacity: .35; }
  .doorsvg .leaf { fill: var(--card-background-color); stroke: var(--primary-text-color); stroke-width: 2.5; }
  .doorsvg .housing { fill: var(--secondary-background-color); stroke: var(--primary-text-color); stroke-width: 1.5; }
  .doorsvg .swing { fill: none; stroke: var(--secondary-text-color); stroke-dasharray: 4 6; }
  .doorsvg .gap { fill: var(--primary-color); font: 600 14px sans-serif; text-anchor: middle; }

  .result { width: 120px; height: 120px; }
  .result.ok circle { fill: none; stroke: var(--success-color, #43a047); stroke-width: 6; }
  .result.ok path { fill: none; stroke: var(--success-color, #43a047); stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
  .result.bad path:first-child { fill: none; stroke: var(--error-color, #db4437); stroke-width: 6; stroke-linejoin: round; }
  .result.bad path:last-child { stroke: var(--error-color, #db4437); stroke-width: 8; stroke-linecap: round; }
  @media (prefers-reduced-motion: reduce) {
    .scene.moving .bolt, .scene.moving .slot { animation: none; }
  }
`;var _={LOCKED:0,UNLOCKED:1,LOCKING:2,UNLOCKING:3,LOCKING_BLOCKED:4,UNLOCKING_BLOCKED:5,LATCH:6,HALF:7},T2=new Set([_.LOCKING,_.UNLOCKING]),P2=new Set([_.LOCKING_BLOCKED,_.UNLOCKING_BLOCKED]),Q1=1,$4=2,k5=10,U=6e4,i7=3e4,o7=2e4,a7={WoLock:"lock","Lock Lite":"lock_lite",WoLockPro:"lock_pro","Lock Ultra":"lock_ultra","Lock Ultra Max":"lock_ultra_max"};function n7(H){return a7[H]??(Object.values(a7).includes(H)?H:"lock_ultra")}var T4=2,P4=500,$2=(H,V)=>H!=null&&V!==null&&V!==void 0&&Math.abs(V-H)>=k5;function A7(H){let V=H?.battery_status;if(V==null)return!1;if(V===1||V===2)return!0;let C=H?.battery;return C!=null&&C<=10&&V!==0}function d7(H){let V=()=>H.status,C=()=>V()?.lock_type===Q1,L=()=>C()&&H.ctx.nightLatch,e=R=>()=>L()?`${R}_nl`:R,r=()=>L()?"set_latch_position":"set_unlock_position",t=()=>V()?.lock_state,a=()=>H.ctx.askLatch?["latch"]:[],M=()=>!!V()?.magnetic_position_alarm,n=()=>H.model==="lock_ultra_max",A=R=>()=>H.ctx.nightLatch?`${R}_nl`:R,p=()=>new Promise(R=>setTimeout(R,P4)),m=R=>{let U2=V()?.knob_angle;return R!=null&&U2!==null&&U2!==void 0&&U2!==R},x=()=>V()?.latch_type!==0,Z=async()=>(H.busy("lock.saving"),await H.act("notify_off"),await H.complete(),"classic_done"),h1=async()=>(H.busy("lock.saving"),H.ctx.unlockAngle=V()?.knob_angle??null,await H.act("set_unlock_position_door_open"),await p(),"l3"),Y1={strings:"done",success:!0,choices:[{text:"lock.finish",run:async()=>"home"}]},T5={canNext:()=>$2(H.ctx.lockAngle,V()?.knob_angle)&&(!L()||V()?.latch_state===$4),hint:()=>$2(H.ctx.lockAngle,V()?.knob_angle)?H.t("lock.hint_no_latch"):H.t("lock.hint_unlock_first",{deg:k5})},I2={door1:{door:"ajar",bolt:0,demo:["door_ajar"],async next(){return H.busy("lock.saving"),await H.act("set_door_open"),"door2"}},door2:{door:"closed",bolt:0,demo:["door_close"],async next(){return M()?"door_nomagnet":(H.busy("lock.testing_lock"),await H.act("set_door_closed"),await H.act("test_lock"),await H.waitStopped(o7),H.busy("lock.saving"),await H.complete(),"door_done")}},door_nomagnet:{strings:"nomagnet_door",door:"closed",choices:[{text:"lock.try_again",run:async()=>"door1"}]},door_done:{success:!0,choices:[{text:"lock.finish",run:async()=>"home"}]}},P5={done:{success:!0,strings:()=>M()?"done_magnet":"done",choices:()=>M()?[{text:"lock.calibrate_magnet",async run(){return await H.startCalibration(),"door1"}},{text:"lock.skip",run:async()=>"close"}]:[{text:"lock.next",run:async()=>"close"}]},close:{door:"closed",bolt:0,button:"lock.done_lock",demo:["door_close"],async next(){return H.busy("lock.testing_lock"),await H.act("lock"),await H.waitState(_.LOCKED,o7),"home"}}},b7={strings:e("g1"),dial:{hand:!0},turnTo:"locked",bolt:1,check:!0,demo:["turn_locked"],async next(){return H.busy("lock.saving"),await H.act("set_lock_position"),H.ctx.lockAngle=V()?.knob_angle??null,"g2"}},B5=async()=>(H.busy("lock.saving"),await H.act(r()),H.ctx.unlockAngle=V()?.knob_angle??null,H.busy("lock.testing_lock"),await H.act("test_lock"),await H.waitState(_.LOCKED,U),"g3"),w7={strings:e("g2"),dial:{hand:!0,showLockMark:!0},turnTo:"unlocked",bolt:0,check:!0,button:"lock.test_lock",demo:()=>L()?["turn_unlocked","release_latch"]:["turn_unlocked"],next:B5},z5={strings:e("g3"),dial:{showLockMark:!0},bolt:1,button:"lock.test_unlock",canNext:()=>t()===_.LOCKED,hint:()=>H.t("lock.hint_lock_first"),async next(){return H.busy("lock.testing_unlock"),await H.act("test_unlock"),await H.waitState(_.UNLOCKED,U),H.busy("lock.saving"),await H.complete(),"done"}};return{auto:{start:!0,steps:()=>[...a(),"auto1","auto2","auto3"],defs:{auto1:{strings:e("auto1"),scene:{door:"open"},dial:{hand:!0},turnTo:"unlocked",bolt:0,demo:()=>L()?["turn_unlocked","release_latch"]:["turn_unlocked"],async next(){return H.busy("lock.working"),C()&&await H.act("set_latch",{has_latch:L()}),await H.act("auto_record_unlocked"),await H.waitFlag("auto_calibration_done",i7),"auto2"}},auto2:{strings:e("auto2"),dial:{},bolt:1,choices:[{text:"lock.correct",async run(){return H.busy("lock.working"),await H.act("auto_record_locked"),await H.waitFlag("auto_calibration_done",i7),"auto3"}},{text:"lock.no",run:async()=>"g1"}]},auto3:{strings:e("auto3"),dial:{},bolt:0,choices:[{text:"lock.correct",async run(){return H.busy("lock.saving"),await H.complete(),"done"}},{text:"lock.no",run:async()=>"g2"}]},g1:b7,g2:w7,g3:z5,...P5,...I2}},manual:{start:!0,steps:()=>[...a(),"m1","m2","g3"],defs:{m1:{strings:e("m1"),dial:{hand:!0},turnTo:"locked",bolt:1,demo:["turn_locked"],async next(){return H.busy("lock.saving"),await H.act("set_lock_position"),H.ctx.lockAngle=V()?.knob_angle??null,"m2"}},m2:{strings:e("m2"),dial:{hand:!0,showLockMark:!0},turnTo:"unlocked",bolt:0,button:"lock.test_lock",demo:()=>L()?["turn_unlocked","release_latch"]:["turn_unlocked"],...T5,next:B5},g3:z5,...P5,...I2}},pro:{start:!0,steps:()=>["p1",...a(),"p2","p3","p4","p5"],defs:{p1:{dial:{hand:!0},turnTo:"locked",bolt:1,demo:["turn_locked"],async next(){return H.busy("lock.saving"),await H.act("set_lock_position_door_closed"),H.ctx.lockAngle=V()?.knob_angle??null,H.ctx.askLatch?"latch":"p2"}},p2:{strings:e("p2"),dial:{hand:!0,showLockMark:!0},turnTo:"unlocked",bolt:0,demo:()=>L()?["turn_unlocked","release_latch"]:["turn_unlocked"],...T5,async next(){return H.busy("lock.saving"),await H.act(r()),H.ctx.unlockAngle=V()?.knob_angle??null,"p3"}},p3:{door:"ajar",bolt:1,demo:["door_ajar","lock_manual"],canNext:()=>$2(H.ctx.unlockAngle,V()?.knob_angle),hint:()=>H.t("lock.hint_lock_by_hand"),async next(){return M()?"p3_nomagnet":(H.busy("lock.saving"),await H.act("set_door_open"),"p4")}},p3_nomagnet:{strings:"nomagnet_pro",door:"ajar",bolt:1,choices:[{text:"lock.try_again",run:async()=>"p3"},{text:"lock.skip",async run(){return H.busy("lock.saving"),await H.act("set_door_open"),"p4"}}]},p4:{door:"ajar",bolt:1,button:"lock.test_unlock",canNext:()=>t()===_.LOCKED,hint:()=>H.t("lock.hint_lock_first"),async next(){return H.busy("lock.testing_unlock"),await H.act("test_unlock"),await H.waitState(_.UNLOCKED,U),"p5"}},p5:{door:"closed",bolt:0,button:"lock.test_lock",demo:["door_close"],canNext:()=>t()===_.UNLOCKED,hint:()=>H.t("lock.hint_unlock_test"),async next(){return H.busy("lock.testing_lock"),await H.act("test_lock"),await H.waitState(_.LOCKED,U),H.busy("lock.saving"),await H.complete(),"pro_done"}},pro_done:{strings:"done",success:!0,choices:[{text:"lock.finish",run:async()=>"home"}]}}},lock1:{start:!0,steps:()=>["l1","l2","l3","l4","l5"],defs:{l1:{door:"closed",dial:{hand:!0},turnTo:"locked",bolt:1,demo:["turn_locked"],async next(){return H.busy("lock.saving"),H.ctx.lockAngle=V()?.knob_angle??null,await H.act("set_lock_position_door_closed"),await p(),"l2"}},l2:{door:"closed",dial:{hand:!0,showLockMark:!0},turnTo:"unlocked",bolt:0,demo:["turn_unlocked"],canNext:()=>m(H.ctx.lockAngle)&&x(),hint:()=>H.t(m(H.ctx.lockAngle)?"lock.hint_lock_type":"lock.hint_turn_unlock"),async next(){return V()?.latch_type===T4&&!H.ctx.latchAsked?"latch1":h1()}},latch1:{door:"closed",bolt:0,choices:[{text:"lock.latch_need_key",async run(){return H.ctx.latchAsked=!0,H.ctx.nightLatch=!0,H.busy("lock.saving"),await H.act("set_latch_type"),H.ctx.unlockAngle=V()?.knob_angle??null,"l3"}},{text:"lock.latch_no_key",async run(){return H.ctx.latchAsked=!0,H.ctx.nightLatch=!1,h1()}}]},l3:{strings:A("l3"),scene:{door:"against",magnet:!0},dial:{showLockMark:!0},turnTo:"locked",bolt:1,demo:["door_against","lock_manual"],canNext:()=>m(H.ctx.unlockAngle)&&x(),hint:()=>H.t("lock.hint_lock_by_hand"),async next(){return H.busy("lock.saving"),await H.act("notify_off"),await p(),await H.act("set_door_open"),await H.act("notify"),"l4"}},l4:{strings:A("l4"),scene:{door:"against"},bolt:1,button:"lock.test_unlock",canNext:()=>t()===_.LOCKED,hint:()=>H.t("lock.hint_lock_first"),async next(){return H.busy("lock.testing_unlock"),await H.act("test_unlock"),await H.waitState(_.UNLOCKED,U),"l5"}},l5:{door:"closed",bolt:0,button:"lock.test_lock",demo:["door_close"],canNext:()=>t()===_.UNLOCKED,hint:()=>H.t("lock.hint_unlock_test"),async next(){return H.busy("lock.testing_lock"),await H.act("test_lock"),await H.waitState(_.LOCKED,U),Z()}},classic_done:Y1}},lite:{start:!0,recalibrateCommits:!0,steps:()=>["t1","t2","t3","t4"],defs:{t1:{scene:{door:"open"},dial:{hand:!0},turnTo:"locked",bolt:1,demo:["turn_locked"],async next(){return H.busy("lock.saving"),H.ctx.lockAngle=V()?.knob_angle??null,await H.act("set_lock_position_door_closed"),await p(),"t2"}},t2:{scene:{door:"open"},dial:{hand:!0,showLockMark:!0},turnTo:"unlocked",bolt:0,button:"lock.test_lock",demo:["turn_unlocked"],canNext:()=>m(H.ctx.lockAngle),hint:()=>H.t("lock.hint_turn_unlock"),async next(){return H.busy("lock.saving"),H.ctx.unlockAngle=V()?.knob_angle??null,await H.act("set_unlock_position_door_open"),await p(),H.busy("lock.testing_lock"),await H.act("test_lock"),await H.waitState(_.LOCKED,U),"t3"}},t3:{scene:{door:"open"},dial:{showLockMark:!0},bolt:1,button:"lock.test_unlock",canNext:()=>t()===_.LOCKED,hint:()=>H.t("lock.hint_lock_first"),async next(){return H.busy("lock.testing_unlock"),await H.act("test_unlock"),await H.waitState(_.UNLOCKED,U),"t4"}},t4:{door:"closed",bolt:0,canNext:()=>t()===_.UNLOCKED,hint:()=>H.t("lock.hint_unlock_test"),async next(){return H.busy("lock.testing_lock"),await H.act("test_lock"),await H.waitState(_.LOCKED,U),Z()}},classic_done:Y1}},half:{start:!1,steps:()=>["half1","half2"],async enter(){H.busy("lock.starting"),await H.act("notify"),n()&&(await H.act("half_lock_start"),H.started=!0)},defs:{half1:{dial:{hand:!0},turnTo:"half",bolt:.5,demo:["turn_half"],enter(){H.ctx.startAngle=V()?.knob_angle??null},canNext:()=>$2(H.ctx.startAngle,V()?.knob_angle),hint:()=>H.t("lock.hint_turn",{deg:k5}),async next(){return H.busy("lock.testing_half"),await H.act("half_lock_set_and_test"),await H.waitFlag("half_lock_calibration_done",U),"half2"}},half2:{dial:{},bolt:.5,choices:[{text:"lock.correct",async run(){return H.busy("lock.saving"),n()&&(await H.act("half_lock_complete"),H.started=!1),await H.act("half_lock_enable"),"half_done"}},{text:"lock.no",run:async()=>"half1"}]},half_done:{success:!0,choices:[{text:"lock.finish",run:async()=>"home"}]}}},door:{start:!0,steps:()=>["door1","door2"],defs:I2}}}function l7(H,V,C,L){if(H==="lock_pro")return["pro"];if(H==="lock")return["lock1"];if(H==="lock_lite")return["lite"];let e=L?.lock_type===Q1;return[...C?["auto"]:[],"manual",...V&&e?["half"]:[],"door"]}var B4={auto:a3,manual:W1,half:z3,door:f3,pro:W1,lock1:W1,lite:W1},z4=3e3,R4=10,B2=class extends Error{constructor(){super(...arguments);this.blocked=!0}},F4=H=>new Promise(V=>setTimeout(V,H)),$=class extends S{constructor(){super(...arguments);this._blocked=!1;this._checked=!1;this.ctx={askLatch:!1,nightLatch:!1};this.started=!1;this._waiters=[]}get model(){return n7(this.device.model)}connectedCallback(){super.connectedCallback(),this.hass&&!this._sub&&this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),this.started&&(this.started=!1,M5(this.hass,this.device.entry_id,"leave").catch(()=>{})),Q(this._sub),this._sub=void 0,this._waiters=[]}firstUpdated(){this._sub||this._subscribe()}_subscribe(){this._sub=t0(this.hass,this.device.entry_id,C=>this._onStatus(C.status)),this._sub.catch(C=>this._error=b(C))}_onStatus(C){this.status=C;for(let L of[...this._waiters])L.check(C)}busy(C){this._busy=this.t(C)}async act(C,L={}){let e=await M5(this.hass,this.device.entry_id,C,L);if(e?.status&&this._onStatus(e.status),!e?.success)throw new Error(this.t("lock.err_command"))}async startCalibration(){this.busy("lock.starting");for(let C=1;;C++)try{await this.act("start"),this.started=!0;return}catch(L){if(C>=R4||!this.isConnected)throw L;await F4(z4)}}_waitFor(C,L,{blockedEnds:e=!1,resolveOnTimeout:r=!1}={}){return new Promise((t,a)=>{let M=()=>{clearTimeout(p),this._waiters=this._waiters.filter(m=>m!==A)},n=!1,A={check:m=>{if(!m)return;let x=m.lock_state!==null&&P2.has(m.lock_state);x||(n=!0),x&&!e?n&&(M(),a(new B2(this.t("lock.err_blocked")))):C(m)&&(M(),t(m))}},p=setTimeout(()=>{M(),r?t(this.status):a(new Error(this.t("lock.err_timeout")))},L);this._waiters.push(A),A.check(this.status)})}waitState(C,L){let e=!1;return this._waitFor(r=>(r.lock_state!==C&&(e=!0),e&&r.lock_state===C),L)}waitFlag(C,L){let e=C==="auto_calibration_done",r=!1;return this._waitFor(t=>{let a=t.lock_state!==null&&T2.has(t.lock_state),M=t.lock_state!==null&&P2.has(t.lock_state);return(a||!t[C]||e&&M)&&(r=!0),r&&!a&&!!t[C]},L,{blockedEnds:e})}async waitStopped(C){let L=!1;await this._waitFor(e=>{let r=e.lock_state!==null&&T2.has(e.lock_state);return r&&(L=!0),L&&!r},C,{blockedEnds:!0,resolveOnTimeout:!0})}async complete(){try{await this.act("complete")}catch(C){throw await this.act("recover").catch(()=>{}),this.started=!1,C}this.started=!1}get flows(){return this._flows??=d7(this)}_goto(C){if(C==="home"){this._home_();return}this._step=C,this._checked=!1,this._def()?.enter?.()}_home_(){this._mode=void 0,this._step=void 0,this._busy=void 0,this._error=void 0,this._blocked=!1}async _startMode(C){this._mode=C;let L=this.device.features.night_latch,e=this.status?.lock_type===Q1;this.ctx={askLatch:e&&L==null,nightLatch:e&&L===!0},this._error=void 0,this._blocked=!1,this._notice=void 0,this._step=void 0;let r=this.flows[C];try{r.start&&await this.startCalibration(),await r.enter?.(),this._goto(r.steps()[0])}catch(t){this._error=b(t),await this._leave(),this._mode=void 0}this._busy=void 0}async _run(C){this._error=void 0,this._blocked=!1;try{this._goto(await C())}catch(L){this._error=b(L),this._blocked=L instanceof B2}this._busy=void 0}async _leave(){this._waiters=[],this.started&&(this.busy("lock.cancelling"),this.started=!1,await this.act("leave").catch(()=>{}))}async _cancel(C=!0){this.started&&C&&!confirm(this.t("lock.confirm_cancel"))||(await this._leave(),this._home_())}async _recalibrate(){let C=this._mode;this.flows[C].recalibrateCommits&&this.started&&(this.busy("lock.saving"),this._waiters=[],this.started=!1,await this.act("notify_off").catch(()=>{}),await this.act("complete").catch(()=>{})),await this._leave(),this._home_(),await this._startMode(C)}async _checkInstall(){await this._leave(),this._home_(),this._notice="install"}_chooseLatch(C){this.ctx.nightLatch=C;let L=this.flows[this._mode].steps();this._goto(L[L.indexOf("latch")+1])}render(){return i`${this._live()} ${this._mode?this._wizard():this._home()}
      ${!this._mode&&this._error?i`<div class="alert error"><div class="text">${this._error}</div></div>`:s}`}_live(){let C=this.status,L=E1(this.hass,"lock.states"),e=(r,t)=>r==null?"\u2014":t(r);return i`<section class="card">
      <h2 class="card-header">${this.t("lock.live")}</h2>
      <div class="card-content">
        ${C?i`${C.available===!1?i`<div class="alert warning"><sb-icon .path=${F}></sb-icon><div class="text">${this.t("lock.offline")}</div></div>`:s}
              <div class="chips">
                <span class="chip"><b>${this.t("lock.state")}</b> <span id="c-state">${e(C.lock_state,r=>L[r]??String(r))}</span></span>
                <span class="chip"><b>${this.t("lock.angle")}</b> <span id="c-angle">${e(C.knob_angle,r=>`${r}\xB0`)}</span></span>
                ${this.model==="lock_lite"?s:i`<span class="chip"><b>${this.t("lock.door")}</b> ${e(C.door_open,r=>this.t(r?"lock.door_open":"lock.door_closed"))}</span>`}
                <span class="chip"><b>${this.t("lock.calibrated")}</b> ${e(C.calibration,r=>this.t(r?"common.yes":"common.no"))}</span>
                <span class="chip"><b>${this.t("lock.battery")}</b> ${e(C.battery,r=>`${r}%`)}</span>
                ${C.lock_type!==null&&C.lock_type!==void 0?i`<span class="chip"><b>${this.t("lock.lock_type")}</b> <span id="c-type">${this.t(C.lock_type===Q1?"lock.type_eu":"lock.type_other")}</span></span>`:s}
                ${C.latch_state||C.latch_type?i`<span class="chip"><b>${this.t("lock.latch")}</b> <span id="c-latch">${this.t((C.latch_state||C.latch_type)===2?"lock.latch_night":"lock.latch_normal")}</span></span>`:s}
              </div>`:i`<div class="busy"><span class="spinner"></span>${this.t("lock.connecting")}</div>`}
      </div>
    </section>`}_home(){let C=this.device.features,L=l7(this.model,C.half_lock,C.auto_calibration,this.status),e=A7(this.status);return i`<section class="card">
      <h2 class="card-header">${this.t("lock.choose")}</h2>
      <div class="card-content">
        <p class="intro">${this.t("lock.experimental")}</p>
        ${e?i`<div class="alert warning" id="lowbatt"><sb-icon .path=${d3}></sb-icon>
              <div class="text">${this.t("lock.low_battery")}</div></div>`:s}
        ${this._notice==="install"?i`<div class="alert warning" id="install"><sb-icon .path=${F}></sb-icon>
              <div class="text pre">${this.t("lock.jam_install")}</div></div>`:s}
      </div>
      <div class="list modes">
        ${L.map(r=>i`<button class="item" data-mode=${r} ?disabled=${e||!this.status} @click=${()=>this._startMode(r)}>
            <sb-icon class="leading" .path=${B4[r]}></sb-icon>
            <span class="text">
              <span class="headline">${this.t(`lock.modes.${r}`)}</span>
              <span class="supporting">${this.t(`lock.modes.${r}_desc`)}</span>
            </span>
            <sb-icon .path=${k1}></sb-icon>
          </button>`)}
      </div>
    </section>`}_def(){if(!(!this._mode||!this._step||this._step==="latch"))return this.flows[this._mode].defs[this._step]}_stringsKey(C){if(this._step==="latch")return"latch";let L=C?.strings;return typeof L=="function"?L():L??this._step}_wizard(){let C=this._mode,L=i`<h2 class="card-header">
      ${this.t(`lock.modes.${C}`)}<span class="spacer"></span>${this._stepLabel()}
    </h2>`;if(!this._step)return i`<section class="card wizard">${L}
        <div class="card-content"><div class="busy"><span class="spinner"></span>${this._busy??""}</div></div>
      </section>`;if(this._blocked)return this._jam(L);let e=this._def(),r=this._stringsKey(e),t=!this._busy&&(!e?.check||this._checked)&&(!e?.canNext||e.canNext()),a=e?.canNext&&!e.canNext()&&!this._busy&&e.hint?e.hint():"",M=e?.demo?typeof e.demo=="function"?e.demo():e.demo:[];return i`<section class="card wizard" data-step=${this._step}>
      ${L}
      <div class="card-content">
        ${this._step==="latch"?this._latchChoice():this._illustration(e)}
        <div class="wz-title">${this.t(`lock.steps.${r}_title`)}</div>
        <div class="wz-text">${this.t(`lock.steps.${r}_text`)}</div>
        ${e?.check?i`<label class="check"><input type="checkbox" data-act="check" .checked=${this._checked} ?disabled=${!!this._busy}
                @change=${n=>this._checked=n.target.checked} />
              ${this.t("lock.check_done")}</label>`:s}
        ${a?i`<div class="hint">${a}</div>`:s}
        ${this.status?.self_adjusting?i`<div class="alert warning"><sb-icon .path=${F}></sb-icon><div class="text">${this.t(this.model==="lock_lite"?"lock.emergency_power":"lock.self_adjusting")}</div></div>`:s}
        ${M.length&&this.hass?.sbDemoLockEvent&&!this._busy?this._demoActions(M):s}
        ${this._busy?i`<div class="busy"><span class="spinner"></span>${this._busy}</div>`:s}
        ${this._error?i`<div class="alert error"><sb-icon .path=${F}></sb-icon><div class="text">${this._error}</div></div>`:s}
      </div>
      <div class="card-actions">${this._actions(e,t)}</div>
    </section>`}_latchChoice(){return i`<div class="latch-choice">
      ${[!0,!1].map(C=>i`<button class="latch-opt" data-act=${C?"latch-night":"latch-onepiece"} @click=${()=>this._chooseLatch(C)}>
          ${O2(C)}
          <span class="headline">${this.t(C?"lock.latch_night_lock":"lock.latch_one_piece")}</span>
          <span class="supporting">${this.t(C?"lock.latch_night_desc":"lock.latch_one_piece_desc")}</span>
        </button>`)}
    </div>`}_jam(C){return i`<section class="card wizard" data-step="jam">
      ${C}
      <div class="card-content">
        <div class="art single">${L7(this.model)}</div>
        <div class="wz-title">${this.t("lock.jam_title")}</div>
        <div class="wz-text">${this.t("lock.jam_text")}</div>
      </div>
      <div class="card-actions">
        <button class="btn" data-act="cancel" @click=${()=>this._cancel(!1)}>${this.t("common.cancel")}</button>
        <button class="btn outlined" data-act="install" @click=${()=>this._checkInstall()}>${this.t("lock.jam_check_install")}</button>
        <button class="btn filled" data-act="recalibrate" @click=${()=>this._recalibrate()}>${this.t("lock.recalibrate")}</button>
      </div>
    </section>`}_demoActions(C){return i`<div class="demo-acts">
      <span>${this.t("lock.demo_hint")}</span>
      ${C.map(L=>i`<button class="btn outlined" data-demo-step=${L}
          @click=${()=>this.hass.sbDemoLockEvent(this.device.entry_id,L)}>${this.t(`demo.lock.${L}`)}</button>`)}
    </div>`}_stepLabel(){let C=this.flows[this._mode].steps(),L=this._step?C.indexOf(this._step):-1;return L>=0?i`<span class="steplabel">${this.t("lock.step",{n:L+1,total:C.length})}</span>`:s}_actions(C,L){let e=i`<button class="btn" data-act="cancel" ?disabled=${!!this._busy} @click=${()=>this._cancel(!C?.success)}>${this.t("common.cancel")}</button>`;if(this._step==="latch")return e;let r=C?.choices?typeof C.choices=="function"?C.choices():C.choices:[];return r.length?i`${C?.success?s:e}
        ${r.map((t,a)=>i`<button class="btn ${a===0?"filled":"outlined"}" data-choice=${a} ?disabled=${!!this._busy}
            @click=${()=>{this.busy("lock.working"),this._run(()=>t.run())}}>${this.t(t.text)}</button>`)}`:i`${e}
      <button class="btn filled" data-act="next" ?disabled=${!L} @click=${()=>this._run(()=>C.next())}>
        ${this.t(C?.button??"lock.next")}
      </button>`}_illustration(C){let L=this.status,e=L?.lock_state??null,r=e!==null&&T2.has(e),t=e!==null&&P2.has(e);if(C?.success)return i`<div class="art single">${e7(!0)}</div>`;if(this._step==="latch1")return i`<div class="art"><div>${O2(!0)}</div><div>${O2(!1)}</div></div>`;let a=e===_.LOCKED?1:e===_.HALF?.5:e===_.UNLOCKED?0:null,M=this._busy?a??C?.bolt??0:C?.bolt??a??0,n=this.model,A=C?.dial?.showLockMark&&this.ctx.lockAngle!==void 0&&this.ctx.lockAngle!==null?[{angle:this.ctx.lockAngle,cls:"lockmark"}]:[],p=L?.rotation_direction!==1,m=C?.turnTo&&C.turnTo!=="half"&&!this._busy?C.turnTo==="unlocked"!==p?"cw":"ccw":void 0,x=C?.turnTo??(C?.bolt===1?"locked":C?.bolt===0?"unlocked":null),Z=C?.scene?.door??C?.door??(L?.door_open?"ajar":"closed"),h1=V7(n,{bolt:M,nightLatch:this.ctx.nightLatch,markers:this.ctx.nightLatch&&C?.turnTo==="unlocked",hand:!!C?.dial?.hand||n==="lock_pro"&&Z==="ajar"&&!!C?.demo,bubble:x==="locked"||x==="unlocked"?x:null,door:Z,magnet:!!C?.door||!!C?.scene?.magnet,knob:L?.knob_angle,blocked:t,moving:r}),Y1=C?.door?t7(C.door==="ajar"?18:0):r7({model:n,angle:L?.knob_angle,marks:A,moving:r,arrow:m});return i`<div class="art"><div>${h1}</div><div>${Y1}</div></div>`}};$.styles=[k,M7,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2.card-header {
        margin: 0;
      }
      .steplabel {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .modes {
        border-top: 1px solid var(--divider-color);
      }
      .modes .item sb-icon.leading {
        color: var(--primary-color);
      }
      .modes .item[disabled] {
        opacity: 0.5;
        cursor: default;
      }
      .wz-title {
        font-size: 18px;
        font-weight: 500;
        margin-top: 16px;
      }
      .wz-text,
      .pre {
        margin-top: 6px;
        line-height: 1.45;
        white-space: pre-line;
      }
      .hint {
        margin-top: 8px;
        color: var(--secondary-text-color);
        font-size: 13px;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        cursor: pointer;
      }
      .check input {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color);
      }
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        color: var(--secondary-text-color);
      }
      .alert {
        margin-top: 12px;
      }
      .latch-choice {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .latch-opt {
        display: flex;
        flex-direction: column;
        gap: 6px;
        text-align: left;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        font: inherit;
        cursor: pointer;
      }
      .latch-opt:hover {
        border-color: var(--primary-color);
      }
      .latch-opt .headline {
        font-weight: 500;
        font-size: 16px;
      }
      .latch-opt .supporting {
        color: var(--secondary-text-color);
        font-size: 13px;
        line-height: 1.4;
      }
      .demo-acts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px dashed var(--warning-color, #ffa600);
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
        .latch-choice {
          grid-template-columns: 1fr;
        }
      }
    `],l([c({attribute:!1})],$.prototype,"device",2),l([v()],$.prototype,"status",2),l([v()],$.prototype,"_mode",2),l([v()],$.prototype,"_step",2),l([v()],$.prototype,"_busy",2),l([v()],$.prototype,"_error",2),l([v()],$.prototype,"_blocked",2),l([v()],$.prototype,"_checked",2),l([v()],$.prototype,"_notice",2),$=l([h("sb-lock-calibration")],$);var E2=(H,V)=>Math.max(0,Math.min(1,H??V));function j2(H,V,C,L){let e=H+C/2,r=V+L*.72;return d`<g class="window">
    <rect x=${H} y=${V} width=${C} height=${L} rx="2" class="sky"/>
    <path d="M${H} ${r} Q${H+C*.25} ${r-L*.16} ${H+C*.45} ${r-L*.04} T${H+C} ${r-L*.1} V${V+L} H${H} Z" class="hill"/>
    <rect x=${H} y=${V} width=${C} height=${L} rx="2" class="frame"/>
    <line x1=${e} y1=${V} x2=${e} y2=${V+L} class="mullion"/>
  </g>`}function N2(H,V,C){if(!H)return null;let L={right:0,down:90,left:180,up:270}[H];return d`<g class="arrow" transform="translate(${V} ${C}) rotate(${L})">
    <path d="M-22 -6 H6 V-15 L24 0 L6 15 V6 H-22 Z"/>
  </g>`}function m7(H,V,C=!1){return d`<g class="hand" transform="translate(${H} ${V}) scale(${C?-1:1} 1)">
    <path d="M-4 -12 c4 -3 12 -3 16 0 c3 2 4 6 4 10 v14 c0 8 -6 14 -14 14 h-4 c-6 0 -10 -5 -10 -11 v-8 c0 -3 2 -5 5 -5 h3 z"/>
    <path d="M-4 -12 c-4 1 -7 4 -7 8 c0 3 2 5 5 5" class="thumb"/>
    <path d="M2 2 h12 M2 9 h12 M3 16 h10" class="fingers"/>
  </g>`}function D4(H,V=160,C=100){return H?d`<g class="badge ok"><circle cx=${V} cy=${C} r="34"/><path d="M${V-16} ${C+1} l11 11 l22 -24"/></g>`:d`<g class="badge bad"><circle cx=${V} cy=${C} r="34"/><path d="M${V} ${C-17} v20 M${V} ${C+14} v1"/></g>`}function _5(H,V,C,L){if(!C)return null;let e=L?1:-1;return d`<g class="motion">
    ${[0,10,20].map(r=>d`<line x1=${H+e*14} y1=${V+r} x2=${H+e*(26+r/2)} y2=${V+r}/>`)}
  </g>`}function R2(H,V,C,L){switch(H){case"rod":return d`<g class="robot">
        <path d="M${V-9} ${C-10} a9 9 0 0 1 18 0 v42 a8 8 0 0 1 -8 8 h-2 a8 8 0 0 1 -8 -8 z" class="body"/>
        <circle cx=${V} cy=${C-4} r="2.4" class="logo"/>
      </g>`;case"c3":return d`<g class="robot">
        <circle cx=${V-4} cy=${C-3} r="3" class="wheel"/><circle cx=${V+4} cy=${C-3} r="3" class="wheel"/>
        <rect x=${V-8} y=${C} width="16" height="50" rx="8" class="body"/>
        <circle cx=${V} cy=${C+10} r="2.4" class="logo"/>
      </g>`;default:{let e=H==="t4_solar"?d`<rect x=${V-13} y=${C+34} width="26" height="34" rx="2" class="solar"/>
              <path d="M${V-13} ${C+45} h26 M${V-13} ${C+56} h26 M${V-4} ${C+34} v34 M${V+4} ${C+34} v34" class="cells"/>`:H==="t4_battery"?d`<rect x=${V-10} y=${C+33} width="20" height="24" rx="5" class="pack"/>
                <path d="M${V-4} ${C+40} h8 M${V-4} ${C+45} h8 M${V-4} ${C+50} h8" class="cells"/>`:null;return d`<g class="robot">
        <path d="M${V-5} ${C-6} v6 M${V+5} ${C-6} v6" class="stem"/>
        <circle cx=${V-5} cy=${C-7} r="3.4" class="wheel"/><circle cx=${V+5} cy=${C-7} r="3.4" class="wheel"/>
        ${e}
        <rect x=${V-10} y=${C} width="20" height="34" rx="6" class="body"/>
        <rect x=${V-6} y=${C+6} width="12" height="5" rx="2.5" class="band"/>
        ${L?d`<text x=${V} y=${C+26} class="lr">${L}</text>`:null}
      </g>`}}}function c7(H){return H==="rod"?d`<g class="mount">
      <rect x="16" y="20" width="288" height="7" rx="3.5" class="rod"/>
      <circle cx="14" cy="23.5" r="8" class="finial"/><circle cx="306" cy="23.5" r="8" class="finial"/>
    </g>`:d`<g class="mount"><rect x="22" y="16" width="276" height="10" rx="2" class="rail"/>
    <line x1="22" y1="22" x2="298" y2="22" class="rail-slot"/></g>`}function F2(H,V,C,L,e,r){let t=[];for(let A=1;A<10;A++)t.push(d`<line x1=${V+C*A/10} y1="32" x2=${V+C*A/10} y2="184"/>`);let a=[];for(let A=0;A<=10;A++){let p=V+C*A/10;a.push(H==="rod"?d`<ellipse cx=${p} cy="23.5" rx="2.6" ry="6" class="ring"/>`:d`<circle cx=${p} cy="28" r="1.8" class="hook"/>`)}let M=e==="left"?V:V+C,n=Array.from({length:10},()=>`q${-C/20} 6 ${-C/10} 0`).join(" ");return d`<g class="panel ${r?"stuck":""}" style="transform: scaleX(${L}); transform-origin: ${M}px 0px">
    <path d="M${V} 30 H${V+C} V184 ${n} Z" class="fabric"/>
    <g class="folds">${t}</g>
    ${a}
  </g>`}function D2(H,V,C=!1){let L=W2(H),e=E2(V.open,0),r=!!V.stuck,t=1-e*.82,a;if(H==="track4_pair"){let n=t,A=25+135*n,p=295-135*n;a=d`${F2(L,25,135,n,"left",r)}${F2(L,160,135,n,"right",r)}
      <g class="slide" style="transform: translateX(${A-160}px)">${R2(L,150,24,"L")}</g>
      <g class="slide" style="transform: translateX(${p-160}px)">${R2(L,170,24,"R")}</g>
      ${_5(A-10,40,V.moving,V.moving==="closing")}
      ${_5(p+10,40,V.moving,V.moving!=="closing")}`}else{let M=V.side??"left",n=270,A=25,p=M==="left"?A+n*t:A+n-n*t,m=M==="left"==(V.moving==="opening");a=d`${F2(L,A,n,t,M,r)}
      <g class="slide" style="transform: translateX(${p-160}px)">${R2(L,160,L==="rod"?32:30)}</g>
      ${_5(p,50,V.moving,m)}`}return d`<g class=${C?"dim":""}>${j2(40,34,240,150)}${c7(L)}${a}</g>`}function W2(H){return H==="rod"?"rod":H==="track4_solar"?"t4_solar":H==="track4_battery"?"t4_battery":H.startsWith("track4")?"t4":"c3"}function z2(H,V){return d`<path d="M${H} ${V} q8 10 0 20 q-8 10 0 20 q8 10 0 20 q-8 10 0 20 q8 10 0 20 q-8 10 0 18" class="fabric-edge"/>`}function E4(H,V){let C=W2(H),L=d`<rect x="60" y="6" width="200" height="8" class="ceiling"/>`,e=V.stuck?"stuck":"";if(H==="rail_u")return d`${L}
      <path d="M128 14 H192 V58 H172 V51 H184 V22 H136 V51 H148 V58 H128 Z" class="profile"/>
      <circle cx="149" cy="42" r="7" class="wheel"/><circle cx="171" cy="42" r="7" class="wheel"/>
      <rect x="156" y="42" width="8" height="40" class="stem"/>
      <rect x="138" y="78" width="44" height="104" rx="20" class="body ${e}"/>
      <circle cx="160" cy="98" r="3.5" class="logo"/>
      <path d="M182 92 h14" class="stem-line"/>${z2(200,82)}`;if(H==="rail_i")return d`${L}
      <path d="M132 14 H188 V20 H163 V46 H188 V52 H132 V46 H157 V20 H132 Z" class="profile"/>
      <circle cx="146" cy="40" r="6" class="wheel"/><circle cx="174" cy="40" r="6" class="wheel"/>
      <path d="M146 40 V60 H174 V40" class="yoke"/>
      <rect x="156" y="58" width="8" height="24" class="stem"/>
      <rect x="138" y="78" width="44" height="104" rx="20" class="body ${e}"/>
      <circle cx="160" cy="98" r="3.5" class="logo"/>
      <path d="M182 92 h14" class="stem-line"/>${z2(200,82)}`;if(H==="rod")return d`<rect x="96" y="44" width="14" height="10" class="ceiling"/><path d="M110 49 H132" class="stem-line"/>
      <path d="M134 40 a26 26 0 0 1 52 0 v118 a20 20 0 0 1 -20 20 h-12 a20 20 0 0 1 -20 -20 z" class="body ${e}"/>
      <circle cx="160" cy="42" r="15" class="rod"/>
      <circle cx="152" cy="24" r="4.5" class="wheel"/><circle cx="168" cy="24" r="4.5" class="wheel"/>
      <circle cx="160" cy="42" r="21" class="ring"/>
      <circle cx="160" cy="90" r="3.5" class="logo"/>
      <path d="M181 50 h15" class="stem-line"/>${z2(200,50)}`;let r=C==="t4_solar"?d`<rect x="188" y="82" width="12" height="70" rx="2" class="solar"/><path d="M188 105 h12 M188 128 h12" class="cells"/>`:C==="t4_battery"?d`<rect x="142" y="142" width="36" height="36" rx="10" class="pack"/>`:null;return d`${L}
    <path d="M126 14 H194 V54 H174 V47 H186 V22 H134 V47 H146 V54 H126 Z" class="profile"/>
    <circle cx="151" cy="38" r="6.5" class="wheel"/><circle cx="169" cy="38" r="6.5" class="wheel"/>
    <path d="M151 38 V60 M169 38 V60" class="yoke"/>
    ${r}
    <rect x="136" y="60" width="48" height="84" rx="14" class="body ${e}"/>
    <rect x="148" y="74" width="24" height="7" rx="3.5" class="band"/>
    <path d="M184 100 h12" class="stem-line"/>${z2(200,104)}`}function j4(H,V){let C=W2(H),L=(V.logo??"inside")!=="inside",e=C.startsWith("t4"),r=e?46:36,t=e?40:52,a=100-t/2,M=L?a+8:a+t-8;return d`
    <rect x="30" y="18" width="260" height="18" rx="2" class="sky"/>
    <path d="M30 36 H290 M160 18 V36" class="frame-line"/>
    <rect x="20" y="88" width="280" height="${C==="rod"?14:24}" rx=${C==="rod"?7:3} class=${C==="rod"?"rod":"rail"}/>
    ${e?d`<rect x=${145} y="94" width="10" height="12" rx="3" class="wheel"/><rect x=${165} y="94" width="10" height="12" rx="3" class="wheel"/>`:null}
    <rect x=${160-r/2} y=${a} width=${r} height=${t} rx=${e?12:18} class="body top ${V.stuck?"stuck":""}"/>
    <circle cx="160" cy=${M} r="5" class="logo"/>
    <g class="arrow small" transform="translate(160 ${L?a-22:a+t+22}) rotate(${L?270:90}) scale(.6)">
      <path d="M-22 -6 H6 V-15 L24 0 L6 15 V6 H-22 Z"/>
    </g>
    <path d="M40 182 h240" class="floor"/>`}function N4(H,V){let C=W2(H),L=V.magnet,e=L===!0?d`<circle cx="262" cy="44" r="20" class="mag-ok"/><path d="M252 44 l7 7 l13 -14" class="mag-ok-mark"/>`:L===!1?d`<circle cx="262" cy="44" r="20" class="mag-bad"/><path d="M254 36 l16 16 M270 36 l-16 16" class="mag-bad-mark"/>`:d`<circle cx="262" cy="44" r="20" class="mag-unknown"/>`;return d`${j2(40,34,240,150)}${c7(C)}
    <rect x="255" y="${C==="rod"?15:12}" width="14" height="${C==="rod"?17:18}" rx="2" class="magnet"/>
    <path d="M255 ${C==="rod"?23:21} h14" class="magnet-pole"/>
    ${F2(C,25,270,1,"left",!!V.stuck)}
    <g class="slide" style="transform: translateX(${72}px)">${R2(C,160,C==="rod"?32:30)}</g>
    ${e}`}function W4(H,V){let C=V.side??"left",L=E2(V.open,.15),e=1-L*.82,r=C==="left"?25+270*e:295-270*e,t=C==="left"?"left":"right";return d`${D2(H,{...V,open:L,side:C,view:"front"})}
    ${m7(r+(C==="left"?14:-14),120,C!=="left")}
    ${N2(V.arrow??t,r+(C==="left"?-46:46),150)}`}function s7(H,V=!1){let C=E2(H.open,0),L=34,e=148,r=1-C,t=(H.marks??[]).map(a=>{let M=L+E2(a.at,0)*e;return d`<g class="mark ${a.cls}"><line x1="44" y1=${M} x2="276" y2=${M}/><path d="M36 ${M-5} L44 ${M} L36 ${M+5} Z"/></g>`});return d`<g class=${V?"dim":""}>${j2(50,L,220,e)}
    <g class="shade ${H.stuck?"stuck":""}">
      <rect x="54" y=${L} width="212" height=${e} class="fabric roller" style="transform: scaleY(${r}); transform-origin: 0px ${L}px"/>
      <g class="slide" style="transform: translateY(${r*e}px)"><rect x="50" y=${L-2} width="220" height="7" rx="3" class="bar"/></g>
    </g>
    <rect x="40" y="16" width="240" height="20" rx="6" class="cassette"/>
    <circle cx="48" cy="26" r="5" class="endcap"/><circle cx="272" cy="26" r="5" class="motor"/>
    ${t}
    ${H.arrow?N2(H.arrow,296,Math.min(L+r*e,170)):null}</g>`}function p7(H){let V=H.roll==="reverse",C=170,L=56,e=22,r=V?C-e:C+e;return d`
    <rect x="110" y="8" width="150" height="8" class="ceiling"/>
    <path d="M${C} 16 V${L-8}" class="stem-line"/><rect x=${C-9} y="16" width="18" height="10" rx="2" class="bracket"/>
    <rect x="72" y="16" width="12" height="176" class="wall"/>
    <rect x="84" y="40" width="10" height="140" class="sky"/><path d="M94 40 V180" class="frame-line"/>
    <path d="M${r} ${L} V176" class="fabric-line ${H.stuck?"stuck":""}"/>
    <rect x=${r-6} y="176" width="12" height="6" rx="2" class="bar"/>
    <circle cx=${C} cy=${L} r=${e} class="tube"/>
    <circle cx=${C} cy=${L} r=${e-7} class="motor"/>
    <path d=${V?`M${C+30} ${L-14} A32 32 0 0 0 ${C-6} ${L-32}`:`M${C-30} ${L-14} A32 32 0 0 1 ${C+6} ${L-32}`} class="turn"/>
    <path d=${V?`M${C-4} ${L-38} l-8 6 l9 4`:`M${C+4} ${L-38} l8 6 l-9 4`} class="turn"/>
    <path d="M100 190 H300" class="floor"/>`}function y5(H,V,C=!1){let L=H==="blind_v",r=(Math.max(0,Math.min(100,V.tilt??50))-50)/50*80,t=Math.max(.1,Math.abs(Math.sin(r*Math.PI/180))),a=r>0,M=[];if(L)for(let A=0;A<9;A++){let p=62+A*22;M.push(d`<g class="slat" style="transform: translate(${p}px, 0px) scaleX(${t})">
        <rect x="-10" y="38" width="20" height="142" rx="2"/>
        <line y1="38" y2="180" x1=${a?10:-10} x2=${a?10:-10} class="edge"/>
      </g>`)}else for(let A=0;A<9;A++){let p=46+A*15.5;M.push(d`<g class="slat" style="transform: translate(0px, ${p}px) scaleY(${t})">
        <rect x="52" y="-7" width="196" height="14" rx="2"/>
        <line x1="52" x2="248" y1=${a?-7:7} y2=${a?-7:7} class="edge"/>
      </g>`)}let n=L?null:d`<path d="M90 34 V184 M210 34 V184" class="ladder"/>`;return d`<g class=${C?"dim":""}>${j2(50,34,200,150)}
    ${n}${M}
    <rect x="40" y="20" width="236" height="14" rx="3" class="headrail"/>
    <rect x="258" y="32" width="18" height="24" rx="4" class="device ${V.stuck?"stuck":""}"/>
    <circle cx="267" cy="44" r="3" class="logo"/>
    <rect x="265" y="56" width="4" height="108" rx="2" class="wand"/>
    ${V.hand?d`${m7(267,132)}<path d="M250 112 a20 9 0 1 0 34 0" class="turn"/><path d="M280 106 l4 7 l-8 2" class="turn"/>`:null}
    ${N2(V.arrow??null,150,108)}</g>`}function b5(H,V){let C=`coverart ${H} ${V.view} ${V.moving?"moving":""} ${V.stuck?"is-stuck":""}`,L,e=!["roller","blind_h","blind_v"].includes(H);switch(V.view){case"profile":L=e?E4(H,V):H==="roller"?p7(V):y5(H,V);break;case"logo":L=e?j4(H,V):null;break;case"magnet":L=e?N4(H,V):null;break;case"pull":L=e?W4(H,V):null;break;case"roll_side":L=H==="roller"?p7(V):null;break;case"result":L=d`${e?D2(H,V,!0):H==="roller"?s7(V,!0):y5(H,{...V,hand:!1,arrow:null},!0)}
        ${D4(V.ok!==!1)}`;break;default:L=e?d`${D2(H,V)}${N2(V.arrow??null,160,108)}`:H==="roller"?s7(V):y5(H,V)}return d`<svg viewBox="0 0 320 200" class=${C} role="img">${L??D2(H,V)}</svg>`}var E={left:"M16 4.5 L6.5 12 L16 19.5 Z",right:"M8 4.5 L17.5 12 L8 19.5 Z",up:"M4.5 16 L12 6.5 L19.5 16 Z",down:"M4.5 8 L12 17.5 L19.5 8 Z",pause:"M6.5 5h4v14h-4z M13.5 5h4v14h-4z",auto:"M12 2a10 10 0 0 1 9.4 6.6l1.6-.6-1 4.4-3.8-2.4 1.4-.5A8 8 0 0 0 4.3 9.8L2.4 9.2A10 10 0 0 1 12 2z M12 22a10 10 0 0 1-9.4-6.6l-1.6.6 1-4.4 3.8 2.4-1.4.5a8 8 0 0 0 15.3-.3l1.9.6A10 10 0 0 1 12 22z M11 6.5h2l4 11h-2.2l-.9-2.6h-3.8l-.9 2.6H7z M12 9.3l-1.3 3.8h2.6z",manual:"M10 2.5a1.5 1.5 0 0 1 1.5 1.5v6.5h1.2a1.4 1.4 0 0 1 2.6.4 1.4 1.4 0 0 1 2.4.6 1.4 1.4 0 0 1 2.3 1V16c0 3.3-2.5 5.5-5.6 5.5h-1.6c-2 0-3.3-.9-4.4-2.4L5.3 15a1.4 1.4 0 0 1 2.2-1.8l1 1.2V4a1.5 1.5 0 0 1 1.5-1.5z",swap:"M7 6h10.2l-2.6-2.6L16 2l5 5-5 5-1.4-1.4L17.2 8H7z M17 18H6.8l2.6 2.6L8 22l-5-5 5-5 1.4 1.4L6.8 16H17z",magnet:"M4 3h5v4H4z M15 3h5v4h-5z M4 8h5v4a3 3 0 0 0 6 0V8h5v4a8 8 0 0 1-16 0z",hand:"M8.5 21.5C6 20.4 4 17.6 4 14.5V9a1.5 1.5 0 0 1 3 0v3h1V5a1.5 1.5 0 0 1 3 0v6h1V4a1.5 1.5 0 0 1 3 0v7h1V6a1.5 1.5 0 0 1 3 0v8.5c0 4-3 7-7 7z"},v7=u`
  svg.coverart {
    width: 100%;
    max-height: 240px;
    --ca-line: var(--primary-text-color);
    --ca-soft: var(--secondary-text-color);
    --ca-fill: var(--card-background-color);
    --ca-fill2: var(--secondary-background-color);
    --ca-accent: var(--primary-color);
  }
  .coverart * { vector-effect: non-scaling-stroke; }
  .coverart .sky { fill: color-mix(in srgb, var(--ca-accent) 16%, var(--ca-fill)); }
  .coverart .hill { fill: color-mix(in srgb, var(--ca-accent) 30%, var(--ca-fill)); opacity: .7; }
  .coverart .window .frame { fill: none; stroke: var(--ca-soft); stroke-width: 3; }
  .coverart .mullion, .coverart .frame-line { stroke: var(--ca-soft); stroke-width: 2; fill: none; }
  .coverart .rail, .coverart .profile, .coverart .headrail, .coverart .cassette {
    fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5;
  }
  .coverart .rail-slot { stroke: var(--ca-soft); stroke-width: 1; opacity: .6; }
  .coverart .rod, .coverart .finial { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .ceiling, .coverart .wall { fill: var(--ca-soft); opacity: .35; }
  .coverart .floor { stroke: var(--ca-soft); stroke-width: 2; opacity: .5; }
  .coverart .fabric { fill: color-mix(in srgb, var(--ca-fill) 82%, var(--ca-soft)); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .folds line { stroke: var(--ca-soft); stroke-width: 1; opacity: .55; }
  .coverart .hook { fill: var(--ca-soft); }
  .coverart .ring { fill: none; stroke: var(--ca-soft); stroke-width: 1.5; }
  .coverart .body { fill: var(--ca-fill); stroke: var(--ca-line); stroke-width: 2; }
  .coverart .band { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1; }
  .coverart .logo { fill: var(--ca-accent); }
  .coverart .wheel { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .stem { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .stem-line, .coverart .yoke { fill: none; stroke: var(--ca-line); stroke-width: 2; }
  .coverart .fabric-edge, .coverart .fabric-line { fill: none; stroke: var(--ca-soft); stroke-width: 3; stroke-linecap: round; }
  .coverart .solar { fill: #26324a; stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .cells { stroke: #7f93b5; stroke-width: 1; fill: none; }
  .coverart .pack { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .pack + .cells, .coverart .t4_battery .cells { stroke: var(--ca-accent); }
  .coverart .lr { font: 600 11px sans-serif; text-anchor: middle; fill: var(--ca-accent); }
  .coverart .slide, .coverart .panel { transition: transform .8s ease; }
  .coverart .motion line { stroke: var(--ca-accent); stroke-width: 2; stroke-linecap: round; animation: ca-fade 1s ease-in-out infinite; }
  .coverart .arrow path { fill: var(--ca-accent); }
  .coverart.moving .arrow path { animation: ca-fade 1.2s ease-in-out infinite; }
  .coverart .hand path { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; stroke-linejoin: round; }
  .coverart .hand .fingers, .coverart .hand .thumb { fill: none; }
  .coverart .magnet { fill: var(--ca-accent); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .magnet-pole { stroke: var(--ca-fill); stroke-width: 1.5; }
  .coverart .mag-ok, .coverart .mag-bad, .coverart .mag-unknown { fill: none; stroke-width: 3; }
  .coverart .mag-ok, .coverart .mag-ok-mark { stroke: var(--success-color, #43a047); }
  .coverart .mag-bad, .coverart .mag-bad-mark { stroke: var(--error-color, #db4437); }
  .coverart .mag-ok-mark, .coverart .mag-bad-mark { fill: none; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
  .coverart .mag-unknown { stroke: var(--ca-soft); stroke-dasharray: 5 5; animation: ca-spin 4s linear infinite; transform-origin: 262px 44px; }
  .coverart .roller { fill: color-mix(in srgb, var(--ca-fill2) 70%, var(--ca-soft)); stroke: var(--ca-line); stroke-width: 1.2; transition: transform .8s ease; }
  .coverart .bar { fill: var(--ca-line); }
  .coverart .endcap { fill: var(--ca-fill); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .motor { fill: var(--ca-accent); opacity: .8; }
  .coverart .tube { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 2; }
  .coverart .bracket { fill: var(--ca-soft); }
  .coverart .mark line { stroke-width: 2; stroke-dasharray: 6 4; }
  .coverart .mark path { stroke: none; }
  .coverart .mark.top line { stroke: var(--ca-soft); }
  .coverart .mark.top path { fill: var(--ca-soft); }
  .coverart .mark.open line { stroke: var(--ca-accent); }
  .coverart .mark.open path { fill: var(--ca-accent); }
  .coverart .mark.closed line { stroke: color-mix(in srgb, var(--ca-accent) 60%, var(--ca-line)); }
  .coverart .mark.closed path { fill: color-mix(in srgb, var(--ca-accent) 60%, var(--ca-line)); }
  .coverart .turn { fill: none; stroke: var(--ca-accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .coverart .slat { transition: transform .6s ease; }
  .coverart .slat rect { fill: color-mix(in srgb, var(--ca-fill) 85%, var(--ca-soft)); stroke: var(--ca-line); stroke-width: 1; }
  .coverart .slat .edge { stroke: var(--ca-soft); stroke-width: 2; }
  .coverart .ladder { stroke: var(--ca-soft); stroke-width: 1; opacity: .6; fill: none; }
  .coverart .device { fill: var(--ca-fill); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .wand { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .dim { opacity: .3; }
  .coverart .badge circle { fill: var(--ca-fill); stroke-width: 5; }
  .coverart .badge path { fill: none; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
  .coverart .badge.ok circle, .coverart .badge.ok path { stroke: var(--success-color, #43a047); }
  .coverart .badge.bad circle, .coverart .badge.bad path { stroke: var(--error-color, #db4437); }
  .coverart .stuck .fabric, .coverart .stuck.fabric-line, .coverart .body.stuck, .coverart .device.stuck,
  .coverart .stuck .roller {
    stroke: var(--error-color, #db4437);
    stroke-width: 2.5;
  }
  @keyframes ca-fade { 50% { opacity: .35; } }
  @keyframes ca-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .coverart .slide, .coverart .panel, .coverart .slat, .coverart .roller { transition: none; }
    .coverart .motion line, .coverart.moving .arrow path, .coverart .mag-unknown { animation: none; }
  }
`;var K=class extends Error{constructor(C,L="restart"){super(C);this.recover=L}};function x7(H,V){return H==="curtain_3"?V?.mount_type==="rod"?"rod":V?.mount_type==="i_rail"?"rail_i":"rail_u":H==="curtain_track_4"?(V?.chain_length??0)>1?"track4_pair":V?.extended_battery_installed?"track4_battery":V?.solar_panel?"track4_solar":"track4":H==="roller_shade"?"roller":V?.slat_direction==="vertical"?"blind_v":"blind_h"}function Z1(H,V){return V?H==="roller_shade"?!!V.motion&&V.motion!=="stopped":H==="blind_tilt"?V.move_state==="moving":!!V.motion_status&&V.motion_status!=="stopped":!1}var q1=H=>Math.max(0,Math.min(1,(H?.position??0)/100));function u7(H,V){switch(H){case"curtain_3":case"curtain_track_4":return["smart","custom",...V?.calibration&&V?.last_calibration_auto&&V?.new_auto?["correction"]:[]];case"roller_shade":return["full",...V?.calibration?["route"]:[]];default:return["tilt"]}}function Z7(H,V){switch(H.model){case"curtain_3":return I4(H,V);case"curtain_track_4":return U4(H,V);case"roller_shade":return K4(H,V);default:return G4(H)}}async function u1(H,V,C=!1){let L=Date.now(),e=C;return H.waitFor(r=>{let t=Z1(H.model,r);return t&&(e=!0),!t&&(e||Date.now()-L>3e3)},V)}var i1=(H,V={})=>({view:"front",open:q1(H.status),side:H.ctx.side,moving:Z1(H.model,H.status)?H.status?.motion_status==="closing"?"closing":"opening":null,...V});async function h7(H){return H.busy("cover.checking_route"),(await H.read("distance"))?.route_too_short?"short":(await H.act("finished"),"done")}function S7(H,V,C){return{calibrating:{scene:()=>i1(H),async enter(){return H.busy("cover.driving_open"),await u1(H,V),H.busy("cover.driving_closed"),await H.act("drive_closed"),await H.sleep(1e3),await u1(H,V),h7(H)}},manualOpen:{scene:()=>i1(H,{arrow:H.ctx.side}),jog:"horizontal",nextText:"cover.auto_close",async enter(){H.busy("cover.driving_open"),await H.act("drive_open"),await H.sleep(1e3),await u1(H,V)},async next(){return"manualClose"}},manualClose:{scene:()=>i1(H,{arrow:H.ctx.side==="left"?"right":"left"}),jog:"horizontal",finish:!0,async enter(){H.busy("cover.driving_closed"),await H.act("drive_closed"),await H.sleep(1e3),await u1(H,V)},async next(){return H.busy("cover.saving"),await H.act("exit"),"done"}},short:{scene:()=>({view:"result",ok:!1}),choices:[{text:"cover.recalibrate",primary:!0,async run(){return await H.act(C),"restart"}},{text:"cover.finish_anyway",async run(){return await H.act("finished"),"done"}}]},corrPull:{strings:"pull",demo:["pull"],scene:()=>i1(H,{view:"pull",hand:!0,arrow:H.ctx.side}),async enter(){return H.busy("cover.waiting_pull"),await H.waitFor(L=>Z1(H.model,L),V),"fixing"}},fixing:{scene:()=>i1(H),async enter(){return H.busy("cover.correcting"),await u1(H,V,!0),await H.act("finished"),"done"}}}}function I4(H,V){let C=S7(H,12e4,V==="custom"?"start_manual":H.status?.new_auto?"start_new_auto":"start_auto"),L={scene:()=>({view:"magnet",magnet:H.status?.magnet_detected??null,side:H.ctx.side}),choices:[{text:"cover.magnet_detect",primary:!0,icon:"magnet",async run(){H.busy("cover.magnet_checking"),await H.act("magnet_on"),await H.sleep(500);let{magnet_detected:A}=await H.read("magnet");if(!A)throw new K(H.t("cover.err_magnet"),"retry");return"@next"}},{text:"cover.magnet_skip",async run(){return await H.act("magnet_off"),"@next"}}]},e={scene:()=>({view:"profile"}),check:"cover.logo_check",async next(){return(V==="custom"||!H.status?.new_auto)&&await H.act(V==="custom"?"start_manual":"start_auto"),"@next"}},r={scene:()=>({view:"front",open:0,side:H.ctx.side,hand:!0}),check:"cover.close_check",next:async()=>"@next"},t={scene:()=>({view:"front",open:.75,side:H.ctx.side}),choices:["left","right"].map(A=>({text:`cover.open_${A}`,icon:A,async run(){return H.ctx.side=A,await H.act("open_side",A==="left"?0:1),"@next"}}))},n={...C,logo:e,close:r,magnet:L,openSide:t,pull:{demo:["pull"],scene:()=>i1(H,{view:"pull",hand:!0,arrow:H.ctx.side}),async enter(){return await H.act("drive_open"),H.busy("cover.waiting_pull"),await H.waitFor(A=>Z1(H.model,A),12e4),"calibrating"}},driveOpen:{strings:"calibrating",scene:()=>i1(H),async enter(){return H.busy("cover.driving_open"),await H.act("drive_open"),await H.sleep(1e3),"calibrating"}}};return V==="correction"?{steps:()=>["corrPull","fixing"],defs:n}:V==="custom"?{steps:()=>["logo","close","magnet","manualOpen","manualClose"],defs:n}:H.status?.new_auto?{steps:()=>["logo","magnet","pull","calibrating"],defs:n}:{steps:()=>["logo","close","magnet","openSide","driveOpen","calibrating"],defs:n}}function U4(H,V){let C=S7(H,115e3,V==="custom"?"start_manual":"start_new_auto"),L={scene:()=>({view:"logo",logo:H.ctx.logo}),choices:(V==="custom"?["inside"]:["inside","outside"]).map(t=>({text:V==="custom"?"cover.start_calibration":`cover.logo_${t}`,primary:t==="inside",async run(){return H.ctx.logo=t,await H.act("mount_side",t==="inside"?0:1),await H.act(V==="custom"?"start_manual":"start_new_auto"),"@next"}}))},r={...C,mount:L,calibrating:{scene:()=>i1(H),async enter(){H.busy("cover.driving_open");let t=Date.now(),a=!1,M=await H.waitFor(n=>{let A=n.motion_status;return A&&A!=="stopped"&&(a=!0),A==="closing"||(a||Date.now()-t>3e3)&&A==="stopped"},115e3);return H.busy("cover.driving_closed"),M.motion_status==="stopped"&&(await H.act("drive_closed"),await H.sleep(1e3)),await u1(H,115e3,M.motion_status==="closing"),h7(H)}}};return V==="correction"?{steps:()=>["corrPull","fixing"],defs:r}:V==="custom"?{steps:()=>["mount","manualOpen","manualClose"],defs:r}:{steps:()=>["mount","calibrating"],defs:r}}function K4(H,V){let C=(t={})=>({view:"front",open:q1(H.status),moving:H.status?.motion==="opening"?"opening":H.status?.motion==="closing"?"closing":null,stuck:!!H.status?.stuck,...t}),L=V==="route",e=t=>({strings:L?"routeUp":"rollUp",scene:()=>C({arrow:"up"}),pause:!L,async enter(){return H.busy(L?"cover.route_rolling":"cover.rolling_up"),t&&await H.act(t),await u1(H,3e5),"stuckSel"}}),r={direction:{scene:()=>({view:"roll_side",roll:H.ctx.roll}),choices:["standard","reverse"].map(t=>({text:`cover.roll_${t}`,primary:t==="standard",async run(){return H.ctx.roll=t,await H.act("start",t==="standard"?1:0),"rollUp"}}))},rollUp:e("to_top"),routeUp:e(""),stuckSel:{scene:()=>C({view:"front",open:1}),choices:[{text:"cover.rolled_up",primary:!0,async run(){return L?(await H.act("route_confirm"),"done"):(await H.act("record_top"),"setOpen")}},{text:"cover.is_stuck",run:async()=>"stuckHelp"}]},stuckHelp:{scene:()=>C({stuck:!0}),nextText:L?"cover.continue_route":"cover.continue_calibration",async next(){return L?(await H.act("route_start"),"routeUp"):"rollUp"}},setOpen:{scene:()=>C({marks:[{at:0,cls:"top"}]}),jog:"vertical",async enter(){H.ctx.jogged=!1},async next(){return H.busy("cover.saving"),await H.act("record_open"),H.ctx.openMark=1-q1(H.status),"setClosed"}},setClosed:{scene:()=>C({marks:[{at:0,cls:"top"},{at:H.ctx.openMark??0,cls:"open"}]}),jog:"vertical",finish:!0,async enter(){H.ctx.jogged=!1},canNext:()=>H.ctx.jogged,hint:()=>H.t("cover.jog_first"),async next(){H.busy("cover.saving"),await H.act("record_closed"),await H.sleep(300);try{await H.act("complete")}catch{throw await H.act("exit").catch(()=>{}),new K(H.t("cover.err_open_below_closed"))}return await H.sleep(500),await H.read("state").catch(()=>{}),"done"}}};return{steps:()=>L?["routeUp","stuckSel"]:["direction","rollUp","stuckSel","setOpen","setClosed"],defs:r}}function G4(H){let V=()=>H.variant==="blind_v",C=[["b1",1,"down"],["b2",2,null],["b3",3,"up"],["b4",5,null]],L=r=>r&&V()?r==="down"?"left":"right":r,e={};return C.forEach(([r,t,a],M)=>{let n=M===C.length-1;e[r]={strings:V()?`${r}v`:r,scene:()=>({view:"front",tilt:H.status?.tilt??50,hand:!0,arrow:L(a??(M===3?"down":"up"))}),finish:n,canNext:()=>M===0||H.ctx.nextOk,hint:()=>H.t("cover.blind_turn_more"),demo:M===0?["turn"]:["turn","wrong_way"],async next(){if(M>0&&H.status?.calibration_wrong_way)throw new K(H.t("cover.err_wrong_way"));return H.busy("cover.saving"),H.ctx.nextOk=!1,await H.act("save",t),n?(await H.act("exit"),"done"):C[M+1][0]}}}),{steps:()=>C.map(([r])=>r),defs:e}}function f7(H,V,C){return V==="correction"?"smart_correction":H==="curtain_3"?V==="smart"&&C?.new_auto?"start_new_auto":null:H==="roller_shade"?V==="route"?"route_start":null:H==="blind_tilt"?"start":null}var Q4={smart:E.auto,custom:E.manual,correction:E.auto,full:E.manual,route:E.up,tilt:E.hand},q4=new Set(["stuck","step_timeout"]),w5=()=>({side:"left",logo:"inside",roll:"standard",jogged:!1,nextOk:!1}),T=class extends S{constructor(){super(...arguments);this._retry=!1;this._checked=!1;this.ctx=w5();this._started=!1;this._waiters=[];this._askedLastAuto=!1}get model(){return this.device.model}get variant(){return x7(this.model,this.status)}get _timeScale(){return this.hass?.sbDemo?.1:1}connectedCallback(){super.connectedCallback(),this.hass&&!this._sub&&this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),Q(this._sub),this._sub=void 0,this._waiters=[]}firstUpdated(){this._sub||this._subscribe()}willUpdate(C){let L=C.get("device");!L||L.entry_id===this.device.entry_id||(Q(this._sub),this._sub=void 0,this._waiters=[],Object.assign(this,{status:void 0,_mode:void 0,_step:void 0,_busy:void 0,_error:void 0,_flow:void 0,_jogging:void 0,_started:!1,_askedLastAuto:!1}),this.ctx=w5(),this.hass&&this._subscribe())}_subscribe(){this._sub=M0(this.hass,this.device.entry_id,C=>this._onStatus(C.status)),this._sub.catch(C=>this._error=b(C))}_onStatus(C){let L=Z1(this.model,this.status);this.status=C,!this._askedLastAuto&&C.calibration&&C.new_auto&&this.model.startsWith("curtain")&&(this._askedLastAuto=!0,this.read("last_auto").catch(()=>{})),C.calibration_next&&(this.ctx.nextOk=!0),this._jogging&&L&&!Z1(this.model,C)&&(this._jogging=void 0,this.model==="roller_shade"&&q4.has(C.motor_stop_reason??"")&&this._fail(new K(this.t("cover.err_stuck")))),this.model==="blind_tilt"&&C.calibration_wrong_way&&this._step&&this._step!=="b1"&&(this._error=this.t("cover.err_wrong_way"),this._retry=!1);for(let e of[...this._waiters])e.check(C)}busy(C){this._busy=C?this.t(C):void 0}async act(C,L){let e=await i5(this.hass,this.device.entry_id,L===void 0?{action:C}:{action:C,value:L});if(e?.status&&this._onStatus(e.status),!e?.success)throw new Error(this.t("cover.err_command"));["start","start_auto","start_manual","start_new_auto","smart_correction","route_start"].includes(C)&&(this._started=!0),["exit","complete","route_confirm","finished","abort"].includes(C)&&(this._started=!1)}async read(C){let L=await i5(this.hass,this.device.entry_id,{read:C});return L?.status&&this._onStatus(L.status),L?.result}waitFor(C,L){return new Promise((e,r)=>{let t=()=>{clearTimeout(M),this._waiters=this._waiters.filter(n=>n!==a)},a={check:n=>{n&&(n.stuck||n.move_state==="stuck"?(t(),r(new K(this.t("cover.err_stuck")))):C(n)&&(t(),e(n)))}},M=setTimeout(()=>{t(),r(new K(this.t("cover.err_timeout")))},L*this._timeScale);this._waiters.push(a),a.check(this.status)})}sleep(C){return new Promise(L=>setTimeout(L,C*Math.max(this._timeScale,.3)))}_def(){return this._step&&this._step!=="done"?this._flow?.defs[this._step]:void 0}async _startMode(C){this._mode=C,this.ctx=w5(),this._error=void 0,this._step=void 0,this._flow=Z7(this,C);let L=f7(this.model,C,this.status);try{L&&(this.busy("cover.starting"),await this.act(L)),this._busy=void 0,this._goto(this._flow.steps()[0])}catch(e){this._busy=void 0,this._error=b(e),this._mode=void 0}}_goto(C){let L=this._flow.steps(),e=C;C==="@next"&&(e=L[L.indexOf(this._step)+1]??"done"),C==="restart"&&(e=L[0]),this._step=e,this._checked=!1,this._jogging=void 0;let r=this._def();r?.enter&&this._run(()=>r.enter())}async _run(C){this._error=void 0,this._retry=!1;try{let L=await C();this._busy=void 0,L&&this._goto(L)}catch(L){this._fail(L)}}async _fail(C){this._busy=void 0,this._waiters=[],this._error=b(C),this._retry=C instanceof K&&C.recover==="retry",!this._retry&&this._started&&await this.act("abort").catch(()=>{})}async _cancel(C=!0){this._started&&C&&!confirm(this.t("cover.confirm_cancel"))||(this._waiters=[],this._started&&(this.busy("cover.cancelling"),await this.act("abort").catch(()=>{})),this._mode=void 0,this._step=void 0,this._busy=void 0,this._error=void 0,this._flow=void 0)}async _jog(C){this._error=void 0;try{this._jogging===C?(this._jogging=void 0,await this.act("pause")):(this._jogging=C,this.ctx.jogged=!0,await this.act(`jog_${C}`))}catch(L){this._jogging=void 0,this._error=b(L)}}render(){return i`${this._live()} ${this._mode?this._wizard():this._home()}`}_value(C,L=String){return C==null?"\u2014":L(C)}_motionText(C){let L=C.motion??C.motion_status??C.move_state;return L?this.t(`cover.motion.${L}`):"\u2014"}_live(){let C=this.status,L=this.model==="blind_tilt";return i`<section class="card">
      <h2 class="card-header">${this.t("cover.live")}</h2>
      <div class="card-content">
        ${C?i`${C.available===!1?i`<div class="alert warning"><sb-icon .path=${F}></sb-icon><div class="text">${this.t("cover.offline")}</div></div>`:s}
              <div class="chips">
                <span class="chip"><b>${this.t("cover.state")}</b> <span id="c-motion">${this._motionText(C)}</span></span>
                <span class="chip"><b>${this.t(L?"cover.tilt":"cover.position")}</b>
                  <span id="c-pos">${this._value(L?C.tilt:C.position,e=>`${e}%`)}</span></span>
                <span class="chip"><b>${this.t("cover.calibrated")}</b> ${this._value(C.calibration,e=>this.t(e?"common.yes":"common.no"))}</span>
                <span class="chip"><b>${this.t("cover.battery")}</b> ${this._value(C.battery,e=>`${e}%`)}</span>
                ${C.firmware?i`<span class="chip"><b>${this.t("cover.firmware")}</b> ${C.firmware}</span>`:s}
                ${C.mount_type?i`<span class="chip"><b>${this.t("cover.mount")}</b> ${this.t(`cover.mounts.${C.mount_type}`)}</span>`:s}
                ${C.slat_direction?i`<span class="chip"><b>${this.t("cover.slats")}</b> ${this.t(`cover.slat.${C.slat_direction}`)}</span>`:s}
              </div>`:i`<div class="busy"><span class="spinner"></span>${this.t("cover.connecting")}</div>`}
      </div>
    </section>`}_homeScene(){let C=this.status;return this.model==="blind_tilt"?{view:"front",tilt:C?.tilt??50}:{view:"front",open:q1(C),side:this.ctx.side}}_home(){let C=this.status,L=u7(this.model,C),e=C?.battery!==null&&C?.battery!==void 0&&C.battery<10;return i`<section class="card">
      <h2 class="card-header">${this.t("cover.choose")}</h2>
      <div class="card-content">
        <div class="art single">${b5(this.variant,this._homeScene())}</div>
        <p class="intro">${this.t(`cover.intro.${this.model}`)}</p>
        <p class="intro">${this.t("cover.experimental")}</p>
        ${e?i`<div class="alert warning"><sb-icon .path=${F}></sb-icon><div class="text">${this.t("cover.err_battery",{min:10})}</div></div>`:s}
        ${this._error?i`<div class="alert error"><div class="text">${this._error}</div></div>`:s}
      </div>
      <div class="list modes">
        ${L.map(r=>i`<button class="item" data-mode=${r} ?disabled=${e||!C} @click=${()=>this._startMode(r)}>
            <sb-icon class="leading" .path=${Q4[r]}></sb-icon>
            <span class="text">
              <span class="headline">${this.t(`cover.modes.${r}`)}</span>
              <span class="supporting">${this.t(`cover.modes.${r}_desc`)}</span>
            </span>
            <sb-icon .path=${k1}></sb-icon>
          </button>`)}
      </div>
    </section>`}_wizard(){let C=this._flow?.steps()??[],L=this._step?C.indexOf(this._step):-1,e=i`<h2 class="card-header">
      ${this.t(`cover.modes.${this._mode}`)}<span class="spacer"></span>
      ${L>=0?i`<span class="steplabel">${this.t("cover.step",{n:L+1,total:C.length})}</span>`:s}
    </h2>`;if(!this._step)return i`<section class="card wizard">${e}
        <div class="card-content">
          ${this._busy?i`<div class="busy"><span class="spinner"></span>${this._busy}</div>`:s}
          ${this._error?i`<div class="alert error"><div class="text">${this._error}</div></div>`:s}
        </div>
        <div class="card-actions">${this._cancelButton()}</div>
      </section>`;let r=this._def(),t=this._step==="done"?"done":r?.strings??this._step,a=this._step==="done"?{view:"result",ok:!0}:this._error&&!this._retry?{view:"result",ok:!1}:r.scene(),M=`cover.steps.${this.model.startsWith("curtain")?"curtain":this.model}.${t}`;return i`<section class="card wizard" data-step=${this._step}>
      ${e}
      <div class="card-content">
        <div class="art single">${b5(this.variant,a)}</div>
        <div class="wz-title">${this.t(`${M}_title`)}</div>
        <div class="wz-text">${this.t(`${M}_text`)}</div>
        ${r?.check?i`<label class="check"><input type="checkbox" .checked=${this._checked}
              @change=${n=>this._checked=n.target.checked} />${this.t(r.check)}</label>`:s}
        ${r?.jog?this._jogControls(r.jog):s}
        ${r?.demo&&this.hass?.sbDemoEvent?this._demoActions(r.demo):s}
        ${this._busy?i`<div class="busy"><span class="spinner"></span>${this._busy}</div>`:s}
        ${this._error?i`<div class="alert error"><sb-icon .path=${F}></sb-icon><div class="text">${this._error}</div></div>`:s}
        ${r?.hint&&r.canNext&&!r.canNext()&&!this._busy?i`<div class="hint">${r.hint()}</div>`:s}
      </div>
      <div class="card-actions">${this._actions(r)}</div>
    </section>`}_jogControls(C){return i`<div class="jog">
      ${(C==="horizontal"?["left","right"]:["up","down"]).map(e=>i`<button class="jogbtn ${this._jogging===e?"on":""}" data-jog=${e} ?disabled=${!!this._busy}
          aria-label=${this.t(`cover.jog_${e}`)} title=${this.t(`cover.jog_${e}`)}
          @click=${()=>this._jog(e)}>
          <sb-icon .path=${this._jogging===e?E.pause:E[e]}></sb-icon>
        </button>`)}
      <span class="joghint">${this.t("cover.jog_hint")}</span>
    </div>`}_demoActions(C){return i`<div class="demo-acts">
      <span>${this.t("cover.demo_hint")}</span>
      ${C.map(L=>i`<button class="btn outlined" data-demo-step=${L}
          @click=${()=>this.hass.sbDemoEvent(this.device.entry_id,L)}>${this.t(`demo.cover.${L}`)}</button>`)}
    </div>`}_cancelButton(){return i`<button class="btn" data-act="cancel" @click=${()=>this._cancel()}>${this.t("common.cancel")}</button>`}_actions(C){if(this._step==="done")return i`<button class="btn filled" data-act="home" @click=${()=>this._cancel(!1)}>${this.t("cover.done")}</button>`;if(this._error&&!this._retry)return i`<button class="btn filled" data-act="home" @click=${()=>this._cancel(!1)}>${this.t("cover.back_to_start")}</button>`;let L=!!this._busy;if(C?.choices)return i`${this._cancelButton()}
        ${C.choices.map((t,a)=>i`<button class="btn ${t.primary?"filled":"outlined"}" data-choice=${a} ?disabled=${L}
            @click=${()=>this._run(()=>t.run())}>
            ${t.icon?i`<sb-icon .path=${E[t.icon]??t.icon} .size=${18}></sb-icon>`:s}${this.t(t.text)}
          </button>`)}`;let e=C?.pause?i`<button class="btn outlined" data-act="pause" ?disabled=${!L} @click=${()=>this.act("pause").catch(t=>this._error=b(t))}>
          <sb-icon .path=${E.pause} .size=${18}></sb-icon>${this.t("cover.pause")}</button>`:s;if(!C?.next)return i`${this._cancelButton()}${e}`;let r=!L&&!this._jogging&&(!C.check||this._checked)&&(!C.canNext||C.canNext());return i`${this._cancelButton()}${e}
      <button class="btn filled" data-act="next" ?disabled=${!r} @click=${()=>this._run(()=>C.next())}>
        ${this.t(C.nextText??(C.finish?"cover.finish":"cover.next"))}
      </button>`}};T.styles=[k,v7,u`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2.card-header {
        margin: 0;
      }
      .steplabel {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .modes {
        border-top: 1px solid var(--divider-color);
      }
      .modes .item sb-icon.leading {
        color: var(--primary-color);
      }
      .modes .item[disabled] {
        opacity: 0.5;
        pointer-events: none;
      }
      .art {
        display: flex;
        justify-content: center;
        padding: 12px;
        border-radius: 12px;
        background: var(--secondary-background-color);
      }
      .art svg {
        width: 100%;
        max-width: 420px;
        max-height: 260px;
      }
      .wz-title {
        font-size: 18px;
        font-weight: 500;
        margin-top: 16px;
      }
      .wz-text {
        margin-top: 6px;
        line-height: 1.45;
        white-space: pre-line;
      }
      .hint {
        margin-top: 8px;
        color: var(--secondary-text-color);
        font-size: 13px;
      }
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        color: var(--secondary-text-color);
      }
      .alert {
        margin-top: 12px;
      }
      .check {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 12px;
        cursor: pointer;
      }
      .check input {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color);
      }
      .jog {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .jogbtn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 2px solid var(--primary-color);
        background: none;
        color: var(--primary-color);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .jogbtn.on {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .jogbtn[disabled] {
        opacity: 0.4;
        cursor: default;
      }
      .joghint {
        color: var(--secondary-text-color);
        font-size: 13px;
        flex: 1;
        min-width: 160px;
      }
      .demo-acts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px dashed var(--warning-color, #ffa600);
      }
      .demo-acts span {
        font-size: 13px;
        color: var(--secondary-text-color);
        flex: 1 1 100%;
      }
      .card-actions .btn sb-icon {
        margin-right: 4px;
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
      }
    `],l([c({attribute:!1})],T.prototype,"device",2),l([v()],T.prototype,"status",2),l([v()],T.prototype,"_mode",2),l([v()],T.prototype,"_step",2),l([v()],T.prototype,"_busy",2),l([v()],T.prototype,"_error",2),l([v()],T.prototype,"_retry",2),l([v()],T.prototype,"_checked",2),l([v()],T.prototype,"_jogging",2),T=l([h("sb-cover-calibration")],T);var k7=14,Y4={lock:{events:"history.lock_events",sources:"history.lock_sources",bad:new Set(["lock_failed","unlock_failed","latch_release_failed","door_left_open","left_unlocked","low_temperature","low_power"]),icon:H=>H==="locked"||H==="half_locked"?F3:R3},keypad:{events:"keypad.events",sources:"keypad.sources",bad:new Set(["unlock_failed","verification_failed","expired_credential","lock_failed","locked_out","tamper"]),icon:()=>i2}},C1=class extends S{constructor(){super(...arguments);this._loading=!1}get _kind(){return Y4[this.device.kind==="keypad"?"keypad":"lock"]}get _entityId(){return m1(this.hass,this.device,C=>C.domain==="event")?.entity_id}updated(){let C=this._entityId,L=C?this.hass.states[C]?.state:void 0;C&&L!==this._lastEvent&&!this._loading&&(this._lastEvent=L,this._load())}async _load(){let C=this._entityId;if(C){this._loading=!0,this._error=void 0;try{this._records=await i0(this.hass,C,k7)}catch(L){this._error=b(L)}finally{this._loading=!1}}}render(){return this._entityId?i`<section class="card">
      <h2 class="card-header">${this.t("history.days",{n:k7})}<span class="spacer"></span>
        <button class="icon-btn" title=${this.t("common.reload")} aria-label=${this.t("common.reload")} ?disabled=${this._loading}
          @click=${this._load}><sb-icon .path=${l2}></sb-icon></button>
      </h2>
      <div class="card-content"><p class="intro">${this.t("history.intro")}</p></div>
      ${this._error?i`<div class="card-content"><div class="alert error"><div class="text">${this._error}</div></div></div>`:s}
      ${this._records?this._records.length?i`<div class="list">${this._records.map(C=>this._row(C))}</div>`:i`<div class="card-content secondary">${this.t("history.empty")}</div>`:i`<div class="card-content busy"><span class="spinner"></span>${this.t("common.loading")}</div>`}
    </section>`:i`<div class="card"><div class="card-content">${this.t("history.no_entity")}</div></div>`}_label(C,L){let e=this.t(`${C}.${L}`);return e===`${C}.${L}`?L:e}_row(C){let L=this._kind,e=L.bad.has(C.type),r=C.credential_name||(C.unknown_credential?this.t("history.unknown_cred"):""),t=[C.source?this._label(L.sources,C.source):"",C.credential?this._label("history.credentials",C.credential):"",r||(C.credential_id!==void 0&&C.credential_id!==null?`#${C.credential_id}`:"")].filter(Boolean).join(" \xB7 ");return i`<div class="item">
      <sb-icon class="leading ${e?"bad":""}" .path=${e?g1:L.icon(C.type)}></sb-icon>
      <span class="text">
        <span class="headline ${e?"error-text":""}">${this._label(L.events,C.type)}</span>
        ${t?i`<span class="supporting">${t}</span>`:s}
      </span>
      <span class="meta">${j1(this.hass,C.time)}</span>
    </div>`}};C1.styles=[k,u`
      h2.card-header {
        margin: 0;
      }
      .busy {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--secondary-text-color);
      }
      .list {
        border-top: 1px solid var(--divider-color);
      }
      sb-icon.leading.bad {
        color: var(--error-color, #db4437);
      }
    `],l([c({attribute:!1})],C1.prototype,"device",2),l([v()],C1.prototype,"_records",2),l([v()],C1.prototype,"_error",2),l([v()],C1.prototype,"_loading",2),C1=l([h("sb-history")],C1);var _7={overview:a2,correction:C0,calibration:J3,passcodes:_3,cards:m3,settings:Z3,history:$3};function O5(H,V){let C=["overview"];return V.features.correction&&C.push("correction"),(V.features.lock_calibration||V.features.cover_calibration)&&C.push("calibration"),V.features.keypad&&C.push("passcodes","cards"),c1(H,V).some(e=>e.category==="config"&&["switch","select","number","time","button"].includes(e.domain))&&C.push("settings"),["lock","keypad"].includes(V.kind)&&m1(H,V,e=>e.domain==="event")&&C.push("history"),C}function $5(H,V){return H.includes(V??"")?V:"overview"}var H1=class extends S{constructor(){super(...arguments);this.offsetLimits={};this.narrow=!1}render(){let C=$5(O5(this.hass,this.device),this.section);return i`<div class="page">
      ${C==="overview"?this._header():s}
      ${this._section(C)}
    </div>`}_header(){let C=this.device;return i`<div class="card device-head">
      <span class="badge"><sb-icon .path=${g2(C)}></sb-icon></span>
      <div class="text">
        <div class="headline">${C.name}</div>
        <div class="supporting">${C.model_name??k2(C.model)} ·
          <a
            class="address"
            href="/config/bluetooth/advertisement-monitor?search=${encodeURIComponent(C.address)}"
            title=${this.t("common.show_advertisements")}
            >${C.address}</a
          >
          ${C.available?s:i` · <span class="error-text">${this.t("common.unavailable")}</span>`}</div>
      </div>
      ${C.device_id&&!C.device_id.startsWith("demo")?i`<a class="btn" href="/config/devices/device/${C.device_id}">
            <sb-icon .path=${N3} .size=${18}></sb-icon>${this.narrow?s:this.t("common.open_device")}
          </a>`:s}
    </div>`}_section(C){let L=this.device;switch(C){case"correction":return i`<sb-sensor-correction .hass=${this.hass} .device=${L} .offsetLimits=${this.offsetLimits}></sb-sensor-correction>`;case"calibration":return L.features.cover_calibration?i`<sb-cover-calibration .hass=${this.hass} .device=${L}></sb-cover-calibration>`:i`<sb-lock-calibration .hass=${this.hass} .device=${L}></sb-lock-calibration>`;case"passcodes":case"cards":return i`<sb-keypad-view .hass=${this.hass} .device=${L} .section=${C}></sb-keypad-view>`;case"settings":return i`<sb-entity-settings .hass=${this.hass} .device=${L}></sb-entity-settings>`;case"history":return i`<sb-history .hass=${this.hass} .device=${L}></sb-history>`;default:return i`<sb-device-overview .hass=${this.hass} .device=${L}></sb-device-overview>`}}};H1.styles=[k,t1,u`
      :host {
        display: block;
      }
      .device-head {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
      }
      .device-head .text {
        flex: 1;
        min-width: 0;
      }
      .headline {
        font-size: 18px;
        line-height: 24px;
      }
      .supporting {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .address {
        color: inherit;
        font-family: var(--code-font-family, monospace);
        text-decoration: underline dotted;
        text-underline-offset: 3px;
      }
      .address:hover {
        color: var(--primary-color);
      }
      .badge {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        flex: none;
      }
      a.btn {
        text-decoration: none;
      }
    `],l([c({attribute:!1})],H1.prototype,"device",2),l([c()],H1.prototype,"section",2),l([c({attribute:!1})],H1.prototype,"offsetLimits",2),l([c({type:Boolean})],H1.prototype,"narrow",2),H1=l([h("sb-device-page")],H1);var y7="switchbot-panel-demo";function X4(){try{return localStorage.getItem(y7)==="1"}catch{return!1}}var j=class extends S{constructor(){super(...arguments);this.narrow=!1;this._path="";this._demo=X4();this._onPopState=()=>{this.route||(this._path=location.hash.slice(1))};this._onNavigate=C=>{C.stopPropagation(),this._go(C.detail.path)}}get _h(){return this._demo?((this._realHass!==this.hass||!this._demoHass)&&(this._realHass=this.hass,this._demoHass=U0(this.hass)),this._demoHass):this.hass}connectedCallback(){super.connectedCallback(),window.addEventListener("popstate",this._onPopState),this.addEventListener("sb-navigate",this._onNavigate),this._unDemo=B0(()=>{this._demoHass=void 0,this.requestUpdate()})}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("popstate",this._onPopState),this.removeEventListener("sb-navigate",this._onNavigate),this._unDemo?.()}willUpdate(C){C.has("route")&&this.route&&(this._path=this.route.path||""),C.has("hass")&&this.hass&&!C.get("hass")&&!this._devices&&this._load()}async _load(){this._error=void 0;try{this._devices=await V0(this._h)}catch(C){this._error=b(C),this._devices={devices:[],offset_limits:{}}}}_go(C,L=!1){if(this._path=C,this.route){let e=this.route.prefix+C;L?history.replaceState(null,"",e):history.pushState(null,"",e),window.dispatchEvent(new CustomEvent("location-changed",{detail:{replace:L}}))}window.scrollTo(0,0)}get _parsed(){let C=/^\/device\/([^/]+)(?:\/([^/]+))?/.exec(this._path);return!C||!this._devices?{}:{device:this._devices.devices.find(L=>L.entry_id===decodeURIComponent(C[1])),section:C[2]}}_toggleDemo(){this._demo=!this._demo;try{localStorage.setItem(y7,this._demo?"1":"0")}catch{}this._devices=void 0,this._go("",!0),this._load()}render(){if(!this.hass)return s;let{device:C,section:L}=this._parsed,e=this._path.startsWith("/device/");return i`
      <header class="header">
      <div class="toolbar">
        ${e?i`<button class="icon-btn" title=${this.t("common.back")} aria-label=${this.t("common.back")}
              @click=${()=>this._go("")}>
              <sb-icon .path=${i3}></sb-icon>
            </button>`:i`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>`}
        <div class="main-title">${C?.name??this.t("title")}</div>
        <button class="demo-toggle ${this._demo?"on":""}" aria-pressed=${this._demo?"true":"false"}
          @click=${this._toggleDemo}>
          <sb-icon .path=${t5} .size=${18}></sb-icon>${this.t("demo.toggle")}
        </button>
      </div>
      ${C?this._renderTabs(C,L):s}
      </header>
      ${this._demo?this._renderDemoBar(C):s}
      ${this._renderContent(e,C,L)}
    `}_renderContent(C,L,e){return this._devices?C&&L?i`<sb-device-page
        .hass=${this._h}
        .device=${L}
        .section=${e}
        .offsetLimits=${this._devices.offset_limits}
        .narrow=${this.narrow}
      ></sb-device-page>`:i`<sb-device-list
      .hass=${this._h}
      .devices=${this._devices.devices}
      .error=${this._error}
    ></sb-device-list>`:i`<div class="page"><div class="card loading"><span class="spinner"></span>${this.t("common.loading")}</div></div>`}_renderTabs(C,L){let e=O5(this._h,C),r=$5(e,L),t=`/device/${encodeURIComponent(C.entry_id)}`;return i`<nav class="tabs" role="tablist">
      ${e.map(a=>i`<a role="tab" class="tab ${a===r?"active":""}" aria-selected=${a===r?"true":"false"}
          href="#${t}/${a}" data-section=${a}
          @click=${M=>{M.preventDefault(),this._go(a==="overview"?t:`${t}/${a}`,!0)}}>
          <sb-icon .path=${_7[a]} .size=${20}></sb-icon><span>${this.t(`sections.${a}`)}</span>
        </a>`)}
    </nav>`}_renderDemoBar(C){let L=C?.kind==="keypad"?["code","card","wrong","tamper"]:[],e=C?.kind==="lock"?["knob","door"]:[];return i`<div class="demo-bar">
      <div class="alert warning">
        <sb-icon .path=${t5}></sb-icon>
        <div class="text">${this.t("demo.banner")}</div>
        ${L.length?i`<div class="sims">
              ${L.map(r=>i`<button class="btn outlined small" @click=${()=>I0[r]()}>${this.t(`demo.${r}`)}</button>`)}
            </div>`:s}
        ${C?.kind==="lock"?i`<div class="sims">
              ${e.map(r=>i`<button class="btn outlined small" data-demo=${r}
                  @click=${()=>h2(C.entry_id,r)}>${this.t(`demo.${r}`)}</button>`)}
              ${b0(C.entry_id).map(r=>i`<button class="btn small ${w0(C.entry_id,r)?"filled":"outlined"}" data-demo=${r}
                  @click=${()=>{O0(C.entry_id,r),this.requestUpdate()}}>${this.t(`demo.lock.${r}`)}</button>`)}
            </div>`:s}
        ${C?.kind==="cover"&&d5(C.entry_id).length?i`<div class="sims">
              ${d5(C.entry_id).map(r=>i`<button class="btn small ${Z0(C.entry_id,r)?"filled":"outlined"}" data-demo=${r}
                  @click=${()=>{v2(C.entry_id,r),this.requestUpdate()}}>${this.t(`demo.cover.${r}`)}</button>`)}
            </div>`:s}
      </div>
    </div>`}};j.styles=[k,t1,u`
      :host {
        display: block;
        min-height: 100vh;
        background: var(--primary-background-color);
      }
      .header {
        position: sticky;
        top: 0;
        z-index: 4;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, var(--text-primary-color, #fff));
        border-bottom: var(--app-header-border-bottom, none);
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        height: var(--header-height, 56px);
        padding: 0 16px 0 4px;
        font-size: 20px;
      }
      .main-title {
        flex: 1;
        margin-left: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 400;
      }
      .demo-toggle {
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 16px;
        border: 1px solid currentColor;
        background: none;
        color: inherit;
        opacity: 0.75;
        cursor: pointer;
      }
      .demo-toggle.on {
        opacity: 1;
        background: color-mix(in srgb, currentColor 18%, transparent);
      }
      .demo-bar {
        max-width: 1000px;
        margin: 16px auto 0;
        padding: 0 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .demo-bar .alert {
        flex-wrap: wrap;
      }
      .demo-bar .alert .text {
        flex: 1 1 240px;
      }
      .sims {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        flex: 1 1 100%;
      }
      .demo-toggle {
        flex: none;
      }
      .tabs {
        display: flex;
        justify-content: center;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
        height: 48px;
        color: inherit;
        opacity: 0.72;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        border-bottom: 2px solid transparent;
      }
      .tab:hover {
        opacity: 1;
      }
      .tab.active {
        opacity: 1;
        border-bottom-color: currentColor;
      }
      @media (max-width: 600px) {
        .tabs {
          justify-content: flex-start;
        }
        .tab {
          padding: 0 12px;
        }
        .tab sb-icon {
          display: none;
        }
      }
      .loading {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 16px;
        color: var(--secondary-text-color);
      }
    `],l([c({type:Boolean})],j.prototype,"narrow",2),l([c({attribute:!1})],j.prototype,"route",2),l([v()],j.prototype,"_path",2),l([v()],j.prototype,"_devices",2),l([v()],j.prototype,"_error",2),l([v()],j.prototype,"_demo",2),j=l([h("switchbot-panel")],j);export{j as SwitchbotPanel};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/custom-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/property.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/state.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/event-options.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/base.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-all.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-async.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
