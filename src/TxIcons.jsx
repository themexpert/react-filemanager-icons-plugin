import React, {Component} from 'react'
import throttle from 'debounce'

import message from 'antd/lib/message'
import Spin from 'antd/lib/spin'
import Input from "antd/lib/input";

require('antd/lib/message/style');
require('antd/lib/spin/style');
require('antd/lib/input/style');

const PLUGIN = "TxIcons";
const ALIAS = "icons";

export default class TxIcons extends Component {
  constructor(props) {
    super(props);
    this.state = {
      icons: [],
      query: '',
      loading: false
    };
  }

  componentDidMount = () => {
    this.setState({loading: true});
    this.loadIcons();
    this.loadFromServer();
  };

  loadIcons = () => {
    const cached = window.localStorage.getItem('icons');
    const icons = cached ? JSON.parse(cached) : [];
    this.setState(icons);
  };

  loadFromServer = () => {
    const cached = window.localStorage.getItem('icon-hash');
    fetch(`${quix.url}/index.php?option=com_quix&task=api.getIcons&${document.getElementById('jform_token').name}=1`, {credentials: 'same-origin'})
      .then(data => data.json())
      .then(data => {
        this.setState({loading: false});
        const icons = data.map(icon=>{
          const parts = icon.svg.match(/"(.*?)"/g);
          icon['viewBox'] = parts[1].replace(/"/g, '');
          icon['path'] = parts[2].replace(/"/g, '');
          return icon;
        });
        const jsonStr = JSON.stringify(icons);

        const hash = this.hashCode(jsonStr);
        if (cached && cached === hash) {
          return;
        }

        this.setState({icons});
        window.localStorage.setItem('icon-hash', hash);
        window.localStorage.setItem('icons', jsonStr);
      })
      .catch(err => {
        console.log(err);
        message.error("Failed to load icons");
        this.setState({loading: false});
      });
  };

  hashCode = string => {
    let hash = 0;
    if (string.length == 0) {
      return hash;
    }
    for (let i = 0; i < string.length; i++) {
      let char = string.charCodeAt(i);
      hash = ((hash<<5)-hash)+char;
      hash = hash & hash;
    }
    return hash;
  };

  handleQuery = e => {
    this.setQuery(e.target.value);
  };
  setQuery = throttle(query=> {
    this.setState({query});
  }, 100);

  fuzzySearch = (needle, haystack) => {
    const hlen = haystack.length;
    const nlen = needle.length;
    if (nlen > hlen) {
      return false;
    }
    if (nlen === hlen) {
      return needle === haystack;
    }
    outer: for (let i = 0, j = 0; i < nlen; i++) {
      const nch = needle.charCodeAt(i);
      while (j < hlen) {
        if (haystack.charCodeAt(j++) === nch) {
          continue outer;
        }
      }
      return false;
    }
    return true;
  };

  selectSVG = svg => {
    if(this.props.store.callback.call(this, {type: 'svg', svg})) {
      this.props.store.closeFileManager();
    }
  };

  render = () => {
    const icons = this.state.icons.filter(icon => {
      return this.fuzzySearch(this.state.query, icon.name);
    });
    return (
      <Spin spinning={this.state.loading}>
        <div className="fm-toolbar">
          <Input defaultValue={this.state.query} onChange={this.handleQuery} placeholder="Search icons for..."/>
        </div>

        <div id="fm-content-holder">
          <div id="fm-content">
            <div className="qx-row">
              {icons.map((icon, i) => {
                return (<div key={`icon-${i}`} className="fm-grid-sm" onDoubleClick={() => this.selectSVG(icon.svg)}>
                  <div className="fm-media">
                    <div className="fm-media__thumb">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox={icon.viewBox}><path d={icon.path}/></svg>
                    </div>
                    <div className="fm-media__caption"><span>{icon.label}</span></div>
                  </div>
                </div>)
              })}
            </div>
          </div>
        </div>
      </Spin>
    );
  };
}
