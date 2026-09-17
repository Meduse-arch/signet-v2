import { supabase } from '../supabase';
import { t } from '../locales/fr';

export class AuthService {
  static async login(identifier: string, password: string): Promise<void> {
    let loginEmail = identifier;

    if (!identifier.includes('@')) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users_profile')
        .select('email')
        .eq('username', identifier)
        .maybeSingle();

      if (profileError || !userProfile || !userProfile.email) {
        throw new Error(t('auth_err_pseudo_not_found'));
      }
      loginEmail = userProfile.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    
    if (error) throw error;
  }

  static async register(identifier: string, username: string, password: string): Promise<void> {
    const { data: existingUser } = await supabase
      .from('users_profile')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      throw new Error(t('auth_err_pseudo_taken'));
    }

    const { data, error } = await supabase.auth.signUp({
      email: identifier,
      password,
      options: {
        data: { username, role_level: 0 } // 0 = player
      }
    });
    
    if (error) throw error;
    
    if (data.user) {
      const { error: insertError } = await supabase
        .from('users_profile')
        .insert([{ 
          id: data.user.id, 
          username, 
          role_level: 0, 
          email: identifier 
        }]);
        
      if (insertError) {
        console.error("Erreur d'insertion profil:", insertError);
        throw new Error(`Le compte est créé mais le profil a échoué: ${insertError.message}`);
      }
    }
  }
}
