import {
  html,
  Component,
  render,
} from "https://unpkg.com/htm/preact/standalone.module.js";

const Loading = () => html` <p>loading...</p> `;

class App extends Component {
  state = {
    page: "dashboard",
  };

  loadCallDetails = (callName) => {
    this.setState({ page: "detailedMetrics", callName });
    return false;
  };

  loadDashboard = () => {
    this.setState({ page: "dashboard" });
    return false;
  };

  render(props, state) {
    let component = null;
    if (state.page === "dashboard") {
      component = html`<${Dashboard}
        loadCallDetails=${this.loadCallDetails}
      />`;
    } else if (state.page === "detailedMetrics") {
      component = html`<${DetailedMetrics}
        callName="${this.state.callName}"
        loadDashboard=${this.loadDashboard}
      />`;
    } else if (state.page === "call") {
      component = html`<${Call} callName=${this.state.callName} />`;
    }

    return html`<div id="container">
      ${component}
    </div>`;
  }
}

class Dashboard extends Component {
  state = { loading: true };

  async componentDidMount() {
    const callsResponse = await fetch("/api/rooms");
    const calls = await callsResponse.json();
    this.setState({ loading: false, calls: calls.data });
  }

  createRoom = async () => {
    const roomResponse = await fetch("/api/rooms", { method: "POST" });
    const room = await roomResponse.json();
    const callsResponse = await fetch("/api/rooms");
    const calls = await callsResponse.json();
    this.setState({ calls: calls.data });
  };

  render(props, state) {
    const roomList =
      !state.calls || state.calls.length === 0
        ? html`<p>no calls to display!</p>`
        : html`
            <table>
              <thead>
                <td>call id</td>
                <td>call name</td>
                <td>join call link</td>
                <td>call metrics</td>
              </thead>
              ${state.calls.map(
                (call) =>
                  html`<${CallItem}
                    call=${call}
                    handleClick=${props.loadCallDetails}
                  />`
              )}
            </table>
          `;

    return html`<h1>Calls Dashboard</h1>
      <button onclick=${this.createRoom}>Create Room</button>
      ${this.state.loading ? html`<${Loading} />` : roomList}`;
  }
}

const CallItem = ({ call, handleClick }) => html`
  <tr>
    <td>${call.id}</td>
    <td>${call.name}</td>
    <td><a href="${call.url}">join</a></td>
    <td onclick=${() => handleClick(call.name)}><a href="">metrics</a></td>
  </tr>
`;

class DetailedMetrics extends Component {
  state = { loading: true };

  async componentDidMount() {
    const callResponse = await fetch(`/api/rooms/${this.props.callName}`);
    const call = await callResponse.json();
    this.setState({ loading: false, call });
  }

  render(props, state) {
    if (state.loading) {
      return html`<${Loading} />`;
    }

    return html`
      <h1>Call ${state.call.name}</h1>
      <p>metrics will go here</p>
      <a href="">go back</a>
    `;
  }
}

class Call extends Component {}

render(html`<${App} />`, document.body);
