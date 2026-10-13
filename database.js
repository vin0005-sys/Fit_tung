const FitDatabase = {
  enabled() {
    return window.FIT_TUNG_SQLITE === true;
  },

  async request(path, method = 'GET', data = null) {
    const response = await fetch('/api/' + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Fit-Tung': '1' },
      credentials: 'same-origin',
      body: data === null ? undefined : JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed');
    return result;
  },

  async start() {
    if (!this.enabled()) return null;
    return (await this.request('me')).user;
  },

  async signIn(email, password) {
    return (await this.request('signin', 'POST', { email, password })).user;
  },

  async signUp(email, password, firstName) {
    return this.request('signup', 'POST', { email, password, firstName });
  },

  async signOut() {
    if (this.enabled()) await this.request('signout', 'POST', {});
  },

  async getClothes() {
    return (await this.request('clothes')).items;
  },

  async saveClothing(item, isEdit) {
    const path = isEdit ? 'clothes/' + item.id : 'clothes';
    return (await this.request(path, isEdit ? 'PUT' : 'POST', item)).item;
  },

  async removeClothing(id) {
    await this.request('clothes/' + id, 'DELETE');
  },

  async getSettings() {
    return (await this.request('settings')).settings;
  },

  async saveSettings(settings) {
    await this.request('settings', 'PUT', settings);
  }
};
