import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log("Attempting to connect to the database to perform a count...");

    const userCount = await prisma.user.count();

    console.log(`Successfully connected! Found ${userCount} users.`);

    return NextResponse.json({
      success: true,
      message: `Connection successful. Found ${userCount} users.`,
    });

  } catch (error) {
    console.error("!!! DATABASE CONNECTION FAILED !!!");
    console.error(error); 

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Failed to connect to the database.",
        error: errorMessage, 
      }),
      { status: 500 }
    );
  }
}
