/*
  FIT_TUNG DATABASE — OPTIONAL SUPABASE CONNECTION

  Supabase uses a PostgreSQL (SQL) database.
  If database-config.js is empty, the app uses browser localStorage instead.
  All database requests require a real signed-in user.
*/

const FitDatabase = {
  client: null,

  enabled() {
    const config = window.FIT_TUNG_SUPABASE || {};
    return Boolean(config.url && config.publishableKey);
  },

  async start() {
    if (!this.enabled()) return null;

    // Only download the database library if a connection is configured.
    if (!window.supabase) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load the Supabase library.'));
        document.head.appendChild(script);
      });
    }

    const config = window.FIT_TUNG_SUPABASE;
    this.client = window.supabase.createClient(config.url, config.publishableKey);
    const { data, error } = await this.client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    return data?.user || null;
  },

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signUp(email, password, firstName) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName } }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  },

  // Convert between our short JS object names and SQL column names.
  fromRow(row) {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      brand: row.brand || '',
      colour: row.colour || '',
      style: row.style || '',
      size: row.size || '',
      weight: row.weight || '',
      zip: row.has_zip,
      last: row.last_worn || '',
      season: row.season || '',
      image: row.image_data || ''
    };
  },

  toRow(item) {
    return {
      name: item.name,
      category: item.category,
      brand: item.brand || '',
      colour: item.colour || '',
      style: item.style || '',
      size: item.size || '',
      weight: item.weight || '',
      has_zip: item.zip ?? null,
      last_worn: item.last || '',
      season: item.season || '',
      image_data: item.image || ''
    };
  },

  async getClothes() {
    const { data, error } = await this.client
      .from('clothing_items').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data.map(row => this.fromRow(row));
  },

  async saveClothing(item, isEdit, userId) {
    let request;
    if (isEdit) {
      request = this.client.from('clothing_items')
        .update(this.toRow(item)).eq('id', item.id).eq('user_id', userId);
    } else {
      request = this.client.from('clothing_items')
        .insert({ ...this.toRow(item), user_id: userId });
    }
    const { data, error } = await request.select().single();
    if (error) throw error;
    return this.fromRow(data);
  },

  async removeClothing(id, userId) {
    const { error } = await this.client.from('clothing_items')
      .delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  },

  async getSettings(userId) {
    const { data, error } = await this.client.from('style_preferences')
      .select('formal, heat, notes').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveSettings(settings, userId) {
    const { error } = await this.client.from('style_preferences').upsert({
      user_id: userId,
      formal: settings.formal,
      heat: settings.heat,
      notes: settings.notes
    });
    if (error) throw error;
  }
};
