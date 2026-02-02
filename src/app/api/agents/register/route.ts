import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { name, description, callback_url } = await req.json();

    // Validate required fields
    if (!name || !callback_url) {
      return NextResponse.json(
        { error: 'Missing required fields: name and callback_url are required' },
        { status: 400 }
      );
    }

    // Generate a unique API key for this agent
    const api_key = `agent_${randomBytes(32).toString('hex')}`;

    // Insert the agent
    const { data, error } = await supabase
      .from('agents')
      .insert({
        name,
        description: description || null,
        api_key,
        callback_url,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An agent with this name already exists' },
          { status: 409 }
        );
      }
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      );
    }

    // Return the agent info (including API key - only shown once!)
    return NextResponse.json({
      message: 'Agent registered successfully!',
      agent: {
        id: data.id,
        name: data.name,
        api_key: data.api_key, // Save this! It won't be shown again
        callback_url: data.callback_url,
      },
      warning: 'Save your API key now - it will not be shown again!',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}
